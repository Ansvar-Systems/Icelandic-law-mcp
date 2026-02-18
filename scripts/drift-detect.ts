#!/usr/bin/env tsx
// scripts/drift-detect.ts — Upstream drift detection per MCP Infrastructure Blueprint §5.3
//
// Fetches statute HTML from Althingi and hashes individual article text to detect
// upstream changes. Uses selector_hint (e.g. "Article 65") to extract the specific
// provision from the page rather than hashing the full (non-deterministic) HTML.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface GoldenHashEntry {
  id: string;
  description: string;
  upstream_url: string;
  selector_hint: string;
  expected_sha256: string;
  expected_snippet: string;
}

interface GoldenHashes {
  provisions: GoldenHashEntry[];
}

/**
 * Strip HTML tags and decode common entities, then normalize whitespace.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<img[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&bdquo;/g, '\u201E')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&mdash;/g, '\u2014')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract the text of a specific article from Althingi statute HTML.
 *
 * selector_hint is like "Article 65" — we look for the G65 anchor
 * and extract text up to the next article anchor or chapter heading.
 */
function extractArticleText(html: string, selectorHint: string): string | null {
  const m = selectorHint.match(/Article\s+(\d+)/i);
  if (!m) return null;

  const articleNum = m[1];

  // Match from the article anchor to the next article anchor, chapter heading, or end-of-body
  const articleRegex = new RegExp(
    `<span id="G${articleNum}"><\\/span>[\\s\\S]*?<b>\\s*${articleNum}\\.\\s*gr\\.<\\/b>([\\s\\S]*?)(?=<span id="G\\d+"><\\/span>|<b>\\s*[IVXLCDM]+\\.\\s*<\\/b>|<\\/body>)`,
    'i',
  );

  const match = articleRegex.exec(html);
  if (!match) return null;

  return htmlToText(match[1]);
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf-8').digest('hex');
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const hashesPath = join(__dirname, '..', 'fixtures', 'golden-hashes.json');
  const hashes = JSON.parse(readFileSync(hashesPath, 'utf-8')) as GoldenHashes;

  // Cache fetched pages to avoid redundant requests for the same URL
  const pageCache = new Map<string, string>();

  let okCount = 0;
  let driftCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  console.log(`Drift detection: checking ${hashes.provisions.length} provisions...\n`);

  for (const entry of hashes.provisions) {
    if (entry.expected_sha256 === 'COMPUTE_ON_FIRST_RUN') {
      console.log(`  SKIP  ${entry.id}: ${entry.description} (hash not yet computed)`);
      skippedCount++;
      continue;
    }

    try {
      let pageHtml = pageCache.get(entry.upstream_url);
      if (!pageHtml) {
        const response = await fetch(entry.upstream_url, {
          headers: { 'User-Agent': 'Ansvar-DriftDetect/1.0' },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          console.log(`  ERROR ${entry.id}: HTTP ${response.status} for ${entry.upstream_url}`);
          errorCount++;
          await sleep(1000);
          continue;
        }

        pageHtml = await response.text();
        pageCache.set(entry.upstream_url, pageHtml);
        await sleep(1000); // Rate-limit: only sleep on actual fetches
      }

      const articleText = extractArticleText(pageHtml, entry.selector_hint);

      if (!articleText) {
        console.log(`  ERROR ${entry.id}: Could not extract "${entry.selector_hint}" from page`);
        errorCount++;
        continue;
      }

      // Verify snippet is present in extracted text
      if (!articleText.toLowerCase().includes(entry.expected_snippet.toLowerCase())) {
        console.log(`  ERROR ${entry.id}: Extracted text does not contain expected snippet "${entry.expected_snippet}"`);
        console.log(`         Text: ${articleText.substring(0, 120)}...`);
        errorCount++;
        continue;
      }

      const hash = sha256(articleText);

      if (hash !== entry.expected_sha256) {
        console.log(`  DRIFT ${entry.id}: ${entry.description}`);
        console.log(`         Expected: ${entry.expected_sha256}`);
        console.log(`         Got:      ${hash}`);
        console.log(`         Text:     ${articleText.substring(0, 100)}...`);
        driftCount++;
      } else {
        console.log(`  OK    ${entry.id}: ${entry.description}`);
        okCount++;
      }
    } catch (err) {
      console.log(`  ERROR ${entry.id}: ${(err as Error).message}`);
      errorCount++;
    }
  }

  console.log(
    `\nResults: ${okCount} OK, ${driftCount} drift, ${errorCount} errors, ${skippedCount} skipped`,
  );

  if (driftCount > 0) process.exit(2);
  if (errorCount > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
