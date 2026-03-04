/**
 * list_sources — Return data source provenance, freshness, and license metadata.
 *
 * Required by the Ansvar MCP Production Audit standard (Phase 1.5).
 */

import type { Database } from '@ansvar/mcp-sqlite';

export interface SourceInfo {
  name: string;
  authority: string;
  url: string;
  retrieval_method: string;
  update_frequency: string;
  license: string;
  coverage: string;
  language: string;
}

export interface ListSourcesResult {
  jurisdiction: string;
  sources: SourceInfo[];
  data_freshness: {
    statute_last_updated: string | null;
    case_law_last_sync: string | null;
  };
  database: {
    tier: string;
    schema_version: string;
    statutes: number;
    provisions: number;
    eu_documents: number;
    eu_references: number;
  };
}

function safeCount(db: Database, sql: string): number {
  try {
    const row = db.prepare(sql).get() as { count: number } | undefined;
    return row ? Number(row.count) : 0;
  } catch {
    return 0;
  }
}

function safeScalar(db: Database, sql: string): string | null {
  try {
    const row = db.prepare(sql).get() as { value: string } | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export function listSources(db: Database): ListSourcesResult {
  // Read tier from db_metadata if available
  const tier = safeScalar(db, "SELECT value FROM db_metadata WHERE key = 'tier'") ?? 'unknown';
  const schemaVersion = safeScalar(db, "SELECT value FROM db_metadata WHERE key = 'schema_version'") ?? '1';

  // Data freshness
  let statuteLastUpdated: string | null = null;
  try {
    const row = db.prepare(
      "SELECT MAX(last_updated) as max_date FROM legal_documents WHERE type = 'statute' AND last_updated IS NOT NULL"
    ).get() as { max_date: string | null } | undefined;
    statuteLastUpdated = row?.max_date ?? null;
  } catch { /* table may not exist */ }

  let caseLawLastSync: string | null = null;
  try {
    const row = db.prepare(
      "SELECT last_sync_date FROM case_law_sync_metadata WHERE id = 1"
    ).get() as { last_sync_date: string } | undefined;
    caseLawLastSync = row?.last_sync_date ?? null;
  } catch { /* table may not exist */ }

  return {
    jurisdiction: 'Iceland (IS)',
    sources: [
      {
        name: 'Althingi Lagasafn',
        authority: 'Alþingi (Icelandic Parliament)',
        url: 'https://www.althingi.is/lagasafn/',
        retrieval_method: 'Web scraping of official XML/HTML publication',
        update_frequency: 'Weekly automated checks, manual re-ingestion as needed',
        license: 'Government Open Data — Icelandic legislation is public domain',
        coverage: 'In-force Icelandic statutes (lög)',
        language: 'Icelandic (is)',
      },
      {
        name: 'Althingi Parliamentary Records',
        authority: 'Alþingi (Icelandic Parliament)',
        url: 'https://www.althingi.is/',
        retrieval_method: 'Official publication channels',
        update_frequency: 'As published',
        license: 'Government Open Data',
        coverage: 'Bills (frumvörp), committee reports (nefndarálit)',
        language: 'Icelandic (is)',
      },
      {
        name: 'EUR-Lex',
        authority: 'Publications Office of the European Union',
        url: 'https://eur-lex.europa.eu/',
        retrieval_method: 'EUR-Lex API and CELEX number validation',
        update_frequency: 'Periodic metadata refresh',
        license: 'EU public domain (Commission Decision 2011/833/EU)',
        coverage: 'EU directive and regulation metadata for cross-referencing with Icelandic implementations via EEA Agreement',
        language: 'Multilingual (metadata only)',
      },
    ],
    data_freshness: {
      statute_last_updated: statuteLastUpdated,
      case_law_last_sync: caseLawLastSync,
    },
    database: {
      tier,
      schema_version: schemaVersion,
      statutes: safeCount(db, "SELECT COUNT(*) as count FROM legal_documents WHERE type = 'statute'"),
      provisions: safeCount(db, 'SELECT COUNT(*) as count FROM legal_provisions'),
      eu_documents: safeCount(db, 'SELECT COUNT(*) as count FROM eu_documents'),
      eu_references: safeCount(db, 'SELECT COUNT(*) as count FROM eu_references'),
    },
  };
}
