#!/usr/bin/env tsx
/**
 * Check for updates to Icelandic legal data.
 *
 * Compares the local DB freshness timestamp against the latest
 * official Althingi Lagasafn snapshot metadata.
 *
 * Exit codes:
 *   0 = up to date (or network/source check unavailable in this environment)
 *   1 = update available or freshness could not be determined from local timestamps
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, '../data/database.db');
const OFFICIAL_ZIP_URL = 'https://www.althingi.is/lagasafn/zip/nuna/allt.zip';
const USER_AGENT = 'Icelandic-Law-MCP/1.0 (+https://github.com/Ansvar-Systems/icelandic-law-mcp)';

interface DbFreshness {
  builtAt: string | null;
  statuteLastUpdated: string | null;
  statuteCount: number;
}

function toIso(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function readDbFreshness(): DbFreshness {
  const db = new Database(DB_PATH, { readonly: true });

  const builtAt = db.prepare(`
    SELECT value
    FROM db_metadata
    WHERE key = 'built_at'
  `).get() as { value?: string } | undefined;

  const statuteRow = db.prepare(`
    SELECT MAX(last_updated) AS max_updated, COUNT(*) AS count
    FROM legal_documents
    WHERE type = 'statute'
  `).get() as { max_updated: string | null; count: number };

  db.close();

  return {
    builtAt: toIso(builtAt?.value ?? null),
    statuteLastUpdated: toIso(statuteRow.max_updated),
    statuteCount: Number(statuteRow.count ?? 0),
  };
}

async function fetchRemoteLastModified(): Promise<string | null> {
  const response = await fetch(OFFICIAL_ZIP_URL, {
    method: 'HEAD',
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': '*/*',
    },
  });

  if (!response.ok) {
    throw new Error(`HEAD ${OFFICIAL_ZIP_URL} failed with HTTP ${response.status}`);
  }

  return toIso(response.headers.get('last-modified'));
}

async function main(): Promise<void> {
  console.log('Icelandic Law MCP - Update Checker');
  console.log('');

  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database not found: ${DB_PATH}`);
    console.error('Run "npm run build:db" first.');
    process.exit(1);
  }

  const local = readDbFreshness();
  let remoteLastModified: string | null = null;

  try {
    remoteLastModified = await fetchRemoteLastModified();
  } catch (error) {
    console.log(
      `Warning: could not reach official source for freshness check (${error instanceof Error ? error.message : String(error)}).`
    );
    console.log('Proceeding without failing because no authoritative comparison could be made in this environment.');
    process.exit(0);
  }

  console.log(`Statutes in database: ${local.statuteCount}`);
  console.log(`DB built_at:          ${local.builtAt ?? 'unknown'}`);
  console.log(`Statute last_updated: ${local.statuteLastUpdated ?? 'unknown'}`);
  console.log(`Remote snapshot:      ${remoteLastModified ?? 'unknown'}`);
  console.log('');

  const localReference = local.statuteLastUpdated ?? local.builtAt;
  if (!localReference || !remoteLastModified) {
    console.log('UPDATE AVAILABLE: could not determine freshness with certainty.');
    console.log('Recommendation: rerun ingestion to align with latest official snapshot.');
    process.exit(1);
  }

  const localTs = new Date(localReference).getTime();
  const remoteTs = new Date(remoteLastModified).getTime();

  if (Number.isNaN(localTs) || Number.isNaN(remoteTs)) {
    console.log('UPDATE AVAILABLE: freshness timestamps could not be parsed reliably.');
    process.exit(1);
  }

  if (remoteTs > localTs) {
    const ageDays = Math.floor((remoteTs - localTs) / (24 * 60 * 60 * 1000));
    console.log(`UPDATE AVAILABLE: official snapshot is newer by ~${ageDays} day(s).`);
    console.log('Run: npm run ingest && npm run build:db');
    process.exit(1);
  }

  console.log('All data appears up to date with the official Althingi snapshot.');
}

main().catch((error) => {
  console.error(`Check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
