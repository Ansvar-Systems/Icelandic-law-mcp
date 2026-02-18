# CLAUDE.md

> Instructions for Claude Code when working on Icelandic Law MCP

## Project Overview

This is an MCP server providing Icelandic legal citation tools — searching statutes, case law, preparatory works, and validating citations. Built with TypeScript and SQLite FTS5 for full-text search.

**Core principle: Verified data only** — the server NEVER generates citations, only returns data verified against authoritative Icelandic legal sources (Althingi/Lagasafn). All database entries are validated during ingestion.

**Data Sources:**
- Althingi Lagasafn (Icelandic Parliament) — official statute publication
- EUR-Lex - Official EU legislation database (metadata for EEA cross-references)

## Architecture

```
src/
├── index.ts                 # MCP server entry point (stdio transport)
├── capabilities.ts          # Runtime tier detection (free/professional)
├── types/
│   ├── index.ts             # Re-exports all types
│   ├── documents.ts         # LegalDocument, DocumentType, DocumentStatus
│   ├── provisions.ts        # LegalProvision, ProvisionRef, CrossReference
│   ├── citations.ts         # ParsedCitation, CitationFormat, ValidationResult
│   └── eu-references.ts     # EU document and reference types
├── citation/
│   ├── parser.ts            # Parse citation strings (L. nr., gr., HRD, etc.)
│   ├── formatter.ts         # Format citations per Icelandic conventions
│   └── validator.ts         # Validate citations against database
├── parsers/
│   ├── provision-parser.ts      # Parse raw statute text into provisions
│   ├── cross-ref-extractor.ts   # Extract cross-references from text
│   ├── amendment-parser.ts      # Parse amendment history
│   └── eu-reference-parser.ts   # Extract EU directive/regulation references
├── utils/
│   ├── fts-query.ts             # FTS5 query builder with Icelandic normalization
│   ├── as-of-date.ts            # Historical date filtering
│   ├── icelandic-normalization.ts # Token variant expansion
│   └── metadata.ts             # Response metadata & disclaimers
└── tools/
    ├── registry.ts              # SINGLE SOURCE OF TRUTH for tool definitions
    ├── search-legislation.ts    # search_legislation - FTS5 provision search
    ├── get-provision.ts         # get_provision - Retrieve specific provision
    ├── search-case-law.ts       # search_case_law - FTS5 case law search
    ├── get-preparatory-works.ts # get_preparatory_works - Linked löggjafarsaga
    ├── validate-citation.ts     # validate_citation - Zero-hallucination check
    ├── build-legal-stance.ts    # build_legal_stance - Multi-source aggregation
    ├── format-citation.ts       # format_citation - Citation formatting
    ├── check-currency.ts        # check_currency - Is statute in force?
    ├── about.ts                 # about - Server metadata & provenance
    ├── list-sources.ts          # list_sources - Data source provenance
    ├── get-eu-basis.ts          # get_eu_basis - EU law for Icelandic statute
    ├── get-icelandic-implementations.ts # get_icelandic_implementations - Icelandic laws for EU act
    ├── search-eu-implementations.ts     # search_eu_implementations - Search EU documents
    ├── get-provision-eu-basis.ts        # get_provision_eu_basis - EU basis for provision
    └── validate-eu-compliance.ts        # validate_eu_compliance - Future feature

api/
├── mcp.ts                   # Vercel Streamable HTTP transport
└── health.ts                # Health check endpoint

scripts/
├── build-db.ts              # Build SQLite database from seed files
├── ingest-althingi.ts       # Ingest statutes from Althingi/Lagasafn
├── check-updates.ts         # Check for statute amendments
├── drift-detect.ts          # Golden hash drift detection
└── extract-definitions.ts   # Extract legal definitions

tests/
├── fixtures/test-db.ts      # In-memory SQLite with Icelandic law sample data
├── citation/                # Parser, formatter, validator tests
├── parsers/                 # Provision parser tests
├── tools/                   # Tool-level integration tests
└── integration/             # Resource & transport tests

__tests__/
└── contract/
    └── golden.test.ts       # 12 golden contract tests

fixtures/
├── golden-tests.json        # Contract test definitions
└── golden-hashes.json       # Drift detection anchors

data/
├── seed/                    # JSON seed files per statute
└── database.db              # SQLite database (~68 MB)
```

## CRITICAL: Tool Definition Architecture

**Both transports (stdio and HTTP) MUST use `src/tools/registry.ts` as the single source of truth for tool definitions.** Never duplicate tool arrays in `index.ts` or `api/mcp.ts`. This prevents tool drift between channels.

```typescript
// CORRECT: Both transports use registerTools()
import { registerTools } from './tools/registry.js';
registerTools(server, db, aboutContext);

// WRONG: Defining tools inline
const TOOLS: Tool[] = [...]; // NEVER DO THIS
```

## MCP Tools (15)

### Core Legal Research Tools (8)

| Tool | Description |
|------|-------------|
| `search_legislation` | FTS5 search on provision text with BM25 ranking |
| `get_provision` | Retrieve specific provision by law number + article |
| `search_case_law` | FTS5 search on case law with court/date filters |
| `get_preparatory_works` | Get linked löggjafarsaga for a statute |
| `validate_citation` | Validate citation against database (zero-hallucination check) |
| `build_legal_stance` | Aggregate citations from statutes, case law, prep works |
| `format_citation` | Format citations (full/short/pinpoint) |
| `check_currency` | Check if statute is in force, amended, or repealed |

### EU Law Integration Tools (5)

| Tool | Description |
|------|-------------|
| `get_eu_basis` | Get EU directives/regulations for Icelandic statute |
| `get_icelandic_implementations` | Find Icelandic laws implementing EU act (via EEA) |
| `search_eu_implementations` | Search EU documents with Icelandic implementation counts |
| `get_provision_eu_basis` | Get EU law references for specific provision |
| `validate_eu_compliance` | Check implementation status (future, requires EU MCP) |

### Metadata Tools (2)

| Tool | Description |
|------|-------------|
| `about` | Server metadata, dataset statistics, freshness, provenance |
| `list_sources` | Data source provenance, license, and freshness metadata |

## Icelandic Law Structure

Icelandic statutes follow this structure:
- **Law number**: number/year format, e.g., "90/2018"
- **Articles** (Greinar): Individual provisions, marked with "gr." (grein)
- **Paragraphs** (Málsgreinar, abbreviated "mgr."): Within articles

Citation formats:
- Full: `L. nr. 90/2018 14. gr.`
- Short: `90/2018 14. gr.`
- Pinpoint: `14. gr.`
- Case law: `HRD 2020 bls. 1234` (Hæstiréttur decision)

Key Icelandic legal terms:
- Lög = Law/Act
- Grein (gr.) = Article/Section
- Málsgrein (mgr.) = Paragraph
- Kafli = Chapter
- Stjórnarskrá = Constitution (33/1944)
- Persónuverndarlög = Data Protection Act (90/2018)

## Key Commands

```bash
# Development
npm run dev              # Run server with hot reload
npm run build            # Compile TypeScript
npm test                 # Run tests (vitest)

# Data Management
npm run ingest           # Ingest in-force statutes from Althingi
npm run ingest:all       # Include repealed statutes
npm run build:db         # Rebuild database from seed/
npm run check-updates    # Check for statute amendments

# EU Data
npm run fetch:eurlex -- --missing     # Fetch missing EU documents
npm run import:eurlex-documents       # Import EUR-Lex documents
npm run migrate:eu-references         # Migrate EU references from seeds
npm run verify:eu-coverage            # Verify EU reference coverage

# Testing
npm run test:contract                 # Run golden contract tests
npm run drift:detect                  # Run drift detection
npm run validate                      # lint + test + contract tests
npx @anthropic/mcp-inspector node dist/index.js
```

## Database Schema

```sql
-- All legal documents (statutes, bills, case law)
CREATE TABLE legal_documents (
  id TEXT PRIMARY KEY,          -- Law number (e.g., "90/2018")
  type TEXT NOT NULL,           -- statute|bill|sou|ds|case_law
  title TEXT NOT NULL,
  title_en TEXT,
  short_name TEXT,
  status TEXT NOT NULL,         -- in_force|amended|repealed|not_yet_in_force
  issued_date TEXT,
  in_force_date TEXT,
  url TEXT,
  description TEXT,
  last_updated TEXT
);

-- Individual provisions from statutes
CREATE TABLE legal_provisions (
  id INTEGER PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES legal_documents(id),
  provision_ref TEXT NOT NULL,  -- e.g., "14" or "3:5"
  chapter TEXT,
  section TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  metadata TEXT,                -- JSON
  UNIQUE(document_id, provision_ref)
);

-- Historical provision versions
CREATE TABLE legal_provision_versions (
  id INTEGER PRIMARY KEY,
  document_id TEXT,
  provision_ref TEXT,
  content TEXT,
  valid_from TEXT,
  valid_to TEXT
);

-- EU directives and regulations
CREATE TABLE eu_documents (
  id TEXT PRIMARY KEY,          -- "directive:2016/679" or "regulation:2016/679"
  type TEXT NOT NULL,
  year INTEGER NOT NULL,
  number INTEGER NOT NULL,
  community TEXT,               -- "EU" | "EG" | "EEG" | "Euratom"
  celex_number TEXT,
  title TEXT,
  title_en TEXT,
  short_name TEXT,              -- "GDPR", "eIDAS", etc.
  in_force BOOLEAN DEFAULT 1,
  adoption_date TEXT,
  url TEXT,
  UNIQUE(type, year, number)
);

-- Icelandic → EU cross-references
CREATE TABLE eu_references (
  id INTEGER PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES legal_documents(id),
  provision_id INTEGER REFERENCES legal_provisions(id),
  eu_document_id TEXT NOT NULL REFERENCES eu_documents(id),
  eu_article TEXT,
  reference_type TEXT,          -- "implements", "supplements", "applies"
  is_primary_implementation BOOLEAN DEFAULT 0,
  context TEXT,
  UNIQUE(document_id, provision_id, eu_document_id, eu_article)
);

-- Tier and build metadata
CREATE TABLE db_metadata (key TEXT PRIMARY KEY, value TEXT);

-- FTS5 indexes (content-synced with triggers)
CREATE VIRTUAL TABLE provisions_fts USING fts5(...);
CREATE VIRTUAL TABLE provision_versions_fts USING fts5(...);
CREATE VIRTUAL TABLE case_law_fts USING fts5(...);
CREATE VIRTUAL TABLE prep_works_fts USING fts5(...);
CREATE VIRTUAL TABLE definitions_fts USING fts5(...);
```

## EU Integration Architecture

### Bi-Directional Reference Model

```
Icelandic Statute ←→ EU Directive/Regulation (via EEA Agreement)
       ↓                      ↓
  Provisions          EU Articles
       ↓                      ↓
    Case Law              CJEU (future)
```

### Example Queries

**Icelandic → EU:**
```sql
-- Find EU basis for Persónuverndarlög
SELECT ed.id, ed.short_name, er.reference_type
FROM eu_references er
JOIN eu_documents ed ON er.eu_document_id = ed.id
WHERE er.document_id = '90/2018';
```

**EU → Icelandic:**
```sql
-- Find Icelandic implementations of GDPR
SELECT ld.id, ld.title, er.is_primary_implementation
FROM eu_references er
JOIN legal_documents ld ON er.document_id = ld.id
WHERE er.eu_document_id = 'regulation:2016/679';
```

## Testing

Tests use in-memory SQLite with sample Icelandic law data:

```typescript
import { createTestDatabase, closeTestDatabase } from '../fixtures/test-db.js';

describe('search_legislation', () => {
  let db: Database;
  beforeAll(() => { db = createTestDatabase(); });
  afterAll(() => { closeTestDatabase(db); });

  it('should find persónuvernd provisions', async () => {
    const result = await searchLegislation(db, { query: 'persónuupplýsingar' });
    expect(result.length).toBeGreaterThan(0);
  });
});
```

Golden contract tests (12) validate against the real database: constitution retrieval, FTS search, citation validation, EU cross-references, and negative/edge cases.

## Database Statistics (v1.0.1)

- **Statutes:** 1,709 laws
- **Provisions:** 19,026 articles
- **Database Size:** ~68 MB
- **MCP Tools:** 15 (8 core + 5 EU + 2 metadata)
- **Golden Tests:** 12 contract tests + drift detection hashes

## Ingestion from Althingi

Source: `https://www.althingi.is/lagasafn/` (official Lagasafn)

The ingestion script scrapes statute XML/HTML from Althingi and parses provisions into structured JSON seed files.

## Resources

- [Althingi Lagasafn](https://www.althingi.is/lagasafn/) - Official statute collection
- [Althingi](https://www.althingi.is/) - Icelandic Parliament
- [EUR-Lex](https://eur-lex.europa.eu/) - EU legislation (for cross-references)

## Git Workflow

- **Never commit directly to `main`.** Always create a feature branch and open a Pull Request.
- Branch protection requires: verified signatures, PR review, and status checks to pass.
- Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, etc.
