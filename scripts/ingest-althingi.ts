#!/usr/bin/env tsx
/**
 * Ingest Icelandic statutes from official Althingi/Lagasafn sources.
 *
 * Source:
 *   - https://www.althingi.is/lagasafn/zip/nuna/allt.zip
 *
 * Behavior:
 *   - Downloads and parses the official Lagasafn snapshot zip
 *   - Extracts statute metadata + section/article structure
 *   - Writes deterministic seed JSON files under data/seed/
 *
 * Usage:
 *   npm run ingest
 *   npm run ingest -- --include-repealed
 *   npm run ingest -- --law 33/1944 --law 90/2018
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, '../data/seed');
const DEFAULT_ZIP_URL = 'https://www.althingi.is/lagasafn/zip/nuna/allt.zip';
const LAGASAFN_INDEX_URL = 'https://www.althingi.is/lagasafn/';
const USER_AGENT = 'Icelandic-Law-MCP/1.0 (+https://github.com/Ansvar-Systems/icelandic-law-mcp)';

const REQUEST_TIMEOUT_MS = 60_000;
const REQUEST_RETRY_COUNT = 4;
const REQUEST_RETRY_BASE_MS = 800;

interface IngestOptions {
  outputDir: string;
  includeRepealed: boolean;
  inForceOnly: boolean;
  maxLaws: number | null;
  laws: Set<string>;
  zipUrl?: string;
  zipFile?: string;
}

interface ProvisionSeed {
  provision_ref: string;
  chapter?: string;
  section: string;
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
  valid_from?: string;
  valid_to?: string;
}

interface DocumentSeed {
  id: string;
  type: 'statute';
  title: string;
  status: 'in_force' | 'repealed';
  issued_date?: string;
  in_force_date?: string;
  url: string;
  description?: string;
  provisions: ProvisionSeed[];
}

interface ParsedLaw {
  document: DocumentSeed;
  fileName: string;
}

interface RunStats {
  totalFiles: number;
  parsedLaws: number;
  writtenLaws: number;
  repealedSkipped: number;
  duplicateLawIds: number;
}

const MONTHS: Record<string, string> = {
  januar: '01',
  janúar: '01',
  februar: '02',
  febrúar: '02',
  mars: '03',
  april: '04',
  apríl: '04',
  mai: '05',
  maí: '05',
  juni: '06',
  júní: '06',
  juli: '07',
  júlí: '07',
  august: '08',
  ágúst: '08',
  september: '09',
  oktober: '10',
  október: '10',
  november: '11',
  nóvember: '11',
  desember: '12',
};

const ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&hellip;': '...',
  '&THORN;': 'Þ',
  '&thorn;': 'þ',
  '&ETH;': 'Ð',
  '&eth;': 'ð',
  '&AElig;': 'Æ',
  '&aelig;': 'æ',
  '&Ouml;': 'Ö',
  '&ouml;': 'ö',
  '&quot;': '"',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
};

function parseArgs(argv: string[]): IngestOptions {
  const options: IngestOptions = {
    outputDir: DEFAULT_OUTPUT_DIR,
    includeRepealed: false,
    inForceOnly: true,
    maxLaws: null,
    laws: new Set<string>(),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--include-repealed') {
      options.includeRepealed = true;
      options.inForceOnly = false;
      continue;
    }
    if (arg === '--in-force-only') {
      options.includeRepealed = false;
      options.inForceOnly = true;
      continue;
    }
    if (arg === '--output-dir' && next) {
      options.outputDir = path.resolve(next);
      i += 1;
      continue;
    }
    if (arg === '--zip-url' && next) {
      options.zipUrl = next;
      i += 1;
      continue;
    }
    if (arg === '--zip-file' && next) {
      options.zipFile = path.resolve(next);
      i += 1;
      continue;
    }
    if (arg === '--max-laws' && next) {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Invalid --max-laws value: ${next}`);
      }
      options.maxLaws = parsed;
      i += 1;
      continue;
    }
    if ((arg === '--law' || arg === '--id') && next) {
      options.laws.add(next.trim());
      i += 1;
    }
  }

  return options;
}

function curlText(url: string): string {
  return execFileSync(
    'curl',
    [
      '-sS',
      '--retry', String(REQUEST_RETRY_COUNT),
      '--retry-delay', String(Math.ceil(REQUEST_RETRY_BASE_MS / 1000)),
      '--retry-all-errors',
      '--connect-timeout', String(Math.ceil(REQUEST_TIMEOUT_MS / 1000)),
      '-A', USER_AGENT,
      url,
    ],
    { encoding: 'utf8' }
  );
}

function curlHead(url: string): string {
  return execFileSync(
    'curl',
    [
      '-sS',
      '-I',
      '--retry', String(REQUEST_RETRY_COUNT),
      '--retry-delay', String(Math.ceil(REQUEST_RETRY_BASE_MS / 1000)),
      '--retry-all-errors',
      '--connect-timeout', String(Math.ceil(REQUEST_TIMEOUT_MS / 1000)),
      '-A', USER_AGENT,
      url,
    ],
    { encoding: 'utf8' }
  );
}

function hasOkStatus(headers: string): boolean {
  return /HTTP\/[0-9.]+\s+200\b/.test(headers);
}

function extractLastModified(headers: string): string | null {
  const match = headers.match(/^last-modified:\s*(.+)$/im);
  return match ? match[1].trim() : null;
}

function discoverEditionZipUrl(): string | null {
  try {
    const html = curlText(LAGASAFN_INDEX_URL);
    const match = html.match(/\/lagasafn\/zip\/([0-9a-z]+)\/allt\.zip/i);
    if (!match) return null;
    return `https://www.althingi.is/lagasafn/zip/${match[1]}/allt.zip`;
  } catch {
    return null;
  }
}

function resolveZipUrl(preferred?: string): string {
  // Prefer explicit URL, then the stable "nuna" endpoint.
  const firstChoice = preferred ?? DEFAULT_ZIP_URL;

  try {
    if (hasOkStatus(curlHead(firstChoice))) {
      return firstChoice;
    }
  } catch {
    // Continue to edition discovery fallback.
  }

  const editionZip = discoverEditionZipUrl();
  if (editionZip) {
    return editionZip;
  }

  // Final fallback: try the default endpoint directly during download.
  return DEFAULT_ZIP_URL;
}

function ensureToolExists(toolName: string): void {
  const probeArg = toolName === 'curl' ? '--version' : '-v';
  try {
    execFileSync(toolName, [probeArg], { stdio: 'ignore' });
  } catch {
    throw new Error(`Required system tool "${toolName}" is not available in PATH.`);
  }
}

function decodeHtmlEntities(text: string): string {
  let out = text;
  for (const [entity, value] of Object.entries(ENTITY_MAP)) {
    out = out.replace(new RegExp(entity, 'g'), value);
  }
  return out;
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function cleanHtmlToText(fragment: string): string {
  const stripped = fragment
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
    .replace(/<img[^>]*>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a [^>]*>/gi, '')
    .replace(/<\/a>/gi, '')
    .replace(/<[^>]+>/g, ' ');

  return normalizeWhitespace(decodeHtmlEntities(stripped));
}

function parseIcelandicDate(raw: string, fallbackYear?: string): string | undefined {
  const compact = normalizeWhitespace(raw).toLowerCase();
  const dateMatch = compact.match(/(\d{1,2})\.\s*([a-záðéíóúýþæö]+)\s*(\d{4})?/u);
  if (!dateMatch) return undefined;

  const day = dateMatch[1].padStart(2, '0');
  const month = MONTHS[dateMatch[2]];
  const year = dateMatch[3] ?? fallbackYear;
  if (!month || !year) return undefined;

  return `${year}-${month}-${day}`;
}

function extractChapterMarkers(html: string): Array<{ index: number; chapter: string }> {
  const markers: Array<{ index: number; chapter: string }> = [];
  const regex = /<b>\s*([IVXLCDM]+)\.\s*<\/b><br>/gi;
  let match: RegExpExecArray | null = regex.exec(html);
  while (match) {
    markers.push({ index: match.index, chapter: match[1] });
    match = regex.exec(html);
  }
  return markers;
}

function getNearestChapter(
  articleIndex: number,
  chapters: Array<{ index: number; chapter: string }>
): string | undefined {
  let nearest: string | undefined;
  for (const marker of chapters) {
    if (marker.index < articleIndex) {
      nearest = marker.chapter;
    } else {
      break;
    }
  }
  return nearest;
}

function extractProvisions(html: string): ProvisionSeed[] {
  const chapterMarkers = extractChapterMarkers(html);
  const provisions: ProvisionSeed[] = [];

  const articleRegex = /<span id="G(\d+)"><\/span>[\s\S]*?<b>\s*([0-9]+(?:\s*[a-z])?)\.\s*gr\.<\/b>([\s\S]*?)(?=<span id="G\d+"><\/span>|<span id="B0"|<\/body>)/gi;
  let match: RegExpExecArray | null = articleRegex.exec(html);

  while (match) {
    const articleAnchor = `G${match[1]}`;
    const section = match[2].replace(/\s+/g, ' ').trim();
    const chapter = getNearestChapter(match.index, chapterMarkers);
    const content = cleanHtmlToText(match[3]);

    if (content) {
      provisions.push({
        provision_ref: chapter ? `${chapter}:${section}` : section,
        chapter,
        section,
        content,
        metadata: {
          source_anchor: articleAnchor,
          section_format: 'article',
        },
      });
    }

    match = articleRegex.exec(html);
  }

  return provisions;
}

function fallbackWholeLawProvision(html: string): ProvisionSeed[] {
  const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return [];

  // Remove header/disclaimer area before first major separator
  const truncated = bodyMatch[1].replace(/^[\s\S]*?<hr>/i, '');
  const content = cleanHtmlToText(truncated);
  if (!content) return [];

  return [
    {
      provision_ref: '1',
      section: '1',
      content,
      metadata: {
        section_format: 'fallback_whole_law',
      },
    },
  ];
}

function parseLawDocument(fileName: string, html: string): ParsedLaw | null {
  const titleTag = html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? '';
  const heading = html.match(/<h2>\s*([^<]+?)\s*<\/h2>/i)?.[1] ?? '';

  const idMatch = (titleTag || heading).match(/(\d{4})\s+nr\.\s*([0-9]+[a-z]?)/i);
  if (!idMatch) return null;

  const year = idMatch[1];
  const number = idMatch[2].toLowerCase();
  const lawNumber = `${number}/${year}`;

  const smallStatus = html.match(/<small><b>([\s\S]*?)<\/b>/i)?.[1] ?? '';
  const statusText = decodeHtmlEntities(smallStatus);
  const status: 'in_force' | 'repealed' =
    /felld[a-záðéíóúýþæö\s]*úr gildi/iu.test(statusText) ? 'repealed' : 'in_force';

  const issuedDateFromTitle = parseIcelandicDate(titleTag, year);
  const inForceRaw = statusText.match(/tók gildi\s+([^.<]+)/iu)?.[1];
  const inForceDate = inForceRaw ? parseIcelandicDate(inForceRaw, year) : undefined;

  const provisions = extractProvisions(html);
  const normalizedProvisions = provisions.length > 0 ? provisions : fallbackWholeLawProvision(html);

  const url = `https://www.althingi.is/lagas/nuna/${fileName}`;
  const title = decodeHtmlEntities(heading || titleTag.split('/').pop() || lawNumber).trim();

  const document: DocumentSeed = {
    id: lawNumber,
    type: 'statute',
    title,
    status,
    issued_date: issuedDateFromTitle,
    in_force_date: inForceDate,
    url,
    description: normalizeWhitespace(statusText) || undefined,
    provisions: normalizedProvisions,
  };

  return { document, fileName };
}

function seedFileNameFromLawId(lawId: string): string {
  const [number, year] = lawId.split('/');
  const safeNumber = (number ?? '').toLowerCase().replace(/[^0-9a-z]/g, '');
  return `${year}_${safeNumber}.json`;
}

function clearExistingSeedFiles(outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    return;
  }

  const generatedLawSeedPattern = /^\d{4}_[0-9a-z]+\.json$/i;
  const entries = fs.readdirSync(outputDir);
  for (const entry of entries) {
    // Only remove files generated by this ingestion run.
    // Preserve auxiliary datasets such as eu-references.json, eurlex-documents.json,
    // and other curated JSON artifacts.
    if (entry === '_index.json' || generatedLawSeedPattern.test(entry)) {
      fs.unlinkSync(path.join(outputDir, entry));
    }
  }
}

function downloadZip(zipUrl: string, zipPath: string): { lastModified: string | null } {
  const headers = curlHead(zipUrl);
  const lastModified = extractLastModified(headers);
  execFileSync(
    'curl',
    [
      '-sS',
      '-L',
      '--retry', String(REQUEST_RETRY_COUNT),
      '--retry-delay', String(Math.ceil(REQUEST_RETRY_BASE_MS / 1000)),
      '--retry-all-errors',
      '--connect-timeout', String(Math.ceil(REQUEST_TIMEOUT_MS / 1000)),
      '-A', USER_AGENT,
      '-o', zipPath,
      zipUrl,
    ],
    { stdio: 'inherit' }
  );
  return { lastModified };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  console.log('Icelandic Law MCP - Official Althingi ingestion');
  console.log(`Output dir: ${options.outputDir}`);
  console.log(`In-force only: ${options.inForceOnly}`);
  if (options.maxLaws) console.log(`Max laws: ${options.maxLaws}`);
  if (options.laws.size > 0) console.log(`Explicit laws: ${Array.from(options.laws).join(', ')}`);
  console.log('');

  ensureToolExists('unzip');
  if (!options.zipFile) {
    ensureToolExists('curl');
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'icelandic-law-ingest-'));
  const zipPath = path.join(tempDir, 'lagasafn-allt.zip');
  const extractDir = path.join(tempDir, 'extract');
  fs.mkdirSync(extractDir, { recursive: true });

  let lastModified: string | null = null;
  let sourceDescriptor: string;

  if (options.zipFile) {
    if (!fs.existsSync(options.zipFile)) {
      throw new Error(`Provided --zip-file does not exist: ${options.zipFile}`);
    }
    fs.copyFileSync(options.zipFile, zipPath);
    lastModified = fs.statSync(options.zipFile).mtime.toISOString();
    sourceDescriptor = options.zipFile;
    console.log(`Using local source zip: ${sourceDescriptor}`);
  } else {
    const zipUrl = resolveZipUrl(options.zipUrl);
    sourceDescriptor = zipUrl;
    console.log(`Resolved source zip: ${zipUrl}`);
    ({ lastModified } = downloadZip(zipUrl, zipPath));
  }

  execFileSync('unzip', ['-qq', '-o', zipPath, '-d', extractDir], { stdio: 'inherit' });

  const allFiles = fs.readdirSync(extractDir)
    .filter(name => name.endsWith('.html'))
    .filter(name => name !== '0_forsida.html')
    .filter(name => !/^\d{1,2}\.html$/.test(name))
    .sort((a, b) => a.localeCompare(b, 'en'));

  const stats: RunStats = {
    totalFiles: allFiles.length,
    parsedLaws: 0,
    writtenLaws: 0,
    repealedSkipped: 0,
    duplicateLawIds: 0,
  };

  const parsed: ParsedLaw[] = [];
  for (const fileName of allFiles) {
    const filePath = path.join(extractDir, fileName);
    const html = fs.readFileSync(filePath, { encoding: 'latin1' });
    const law = parseLawDocument(fileName, html);
    if (!law) continue;
    stats.parsedLaws += 1;
    parsed.push(law);
  }

  parsed.sort((a, b) => a.document.id.localeCompare(b.document.id, 'en'));

  const selected: ParsedLaw[] = [];
  for (const law of parsed) {
    if (options.laws.size > 0 && !options.laws.has(law.document.id)) {
      continue;
    }

    if (options.inForceOnly && law.document.status !== 'in_force') {
      stats.repealedSkipped += 1;
      continue;
    }

    if (!options.includeRepealed && law.document.status === 'repealed') {
      stats.repealedSkipped += 1;
      continue;
    }

    selected.push(law);
  }

  // Deduplicate by legal id deterministically. The source file list is sorted,
  // and this keeps the last entry for a duplicated id (same end-result as file
  // overwrite behavior, but with accurate accounting).
  const dedupedById = new Map<string, ParsedLaw>();
  for (const law of selected) {
    if (dedupedById.has(law.document.id)) {
      stats.duplicateLawIds += 1;
    }
    dedupedById.set(law.document.id, law);
  }

  const dedupedLaws = Array.from(dedupedById.values())
    .sort((a, b) => a.document.id.localeCompare(b.document.id, 'en'));

  clearExistingSeedFiles(options.outputDir);

  let written = 0;
  for (const law of dedupedLaws) {
    if (options.maxLaws && written >= options.maxLaws) {
      break;
    }
    const outPath = path.join(options.outputDir, seedFileNameFromLawId(law.document.id));
    fs.writeFileSync(outPath, `${JSON.stringify(law.document, null, 2)}\n`);
    written += 1;
  }

  stats.writtenLaws = written;

  const indexPath = path.join(options.outputDir, '_index.json');
  const indexPayload = {
    generated_at: new Date().toISOString(),
    source: {
      name: 'Althingi Lagasafn',
      zip_url: sourceDescriptor,
      zip_last_modified: lastModified,
    },
    filters: {
      in_force_only: options.inForceOnly,
      include_repealed: options.includeRepealed,
      explicit_laws: Array.from(options.laws),
      max_laws: options.maxLaws,
    },
    statistics: stats,
  };
  fs.writeFileSync(indexPath, `${JSON.stringify(indexPayload, null, 2)}\n`);

  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log('');
  console.log('Ingestion complete.');
  console.log(`  Source files scanned: ${stats.totalFiles}`);
  console.log(`  Parsed laws:          ${stats.parsedLaws}`);
  console.log(`  Written seed files:   ${stats.writtenLaws}`);
  console.log(`  Duplicate IDs merged: ${stats.duplicateLawIds}`);
  console.log(`  Repealed skipped:     ${stats.repealedSkipped}`);
  console.log(`  Index file:           ${indexPath}`);
}

main().catch((error) => {
  console.error(`Ingestion failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
