# Icelandic Law MCP Server

[![npm version](https://badge.fury.io/js/@ansvar%2Ficelandic-law-mcp.svg)](https://www.npmjs.com/package/@ansvar/icelandic-law-mcp)
[![CI](https://github.com/Ansvar-Systems/icelandic-law-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/icelandic-law-mcp/actions/workflows/ci.yml)
[![Daily Data Check](https://github.com/Ansvar-Systems/icelandic-law-mcp/actions/workflows/check-updates.yml/badge.svg)](https://github.com/Ansvar-Systems/icelandic-law-mcp/actions/workflows/check-updates.yml)
[![CodeQL](https://github.com/Ansvar-Systems/icelandic-law-mcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/Ansvar-Systems/icelandic-law-mcp/actions/workflows/codeql.yml)
[![Semgrep](https://github.com/Ansvar-Systems/icelandic-law-mcp/actions/workflows/semgrep.yml/badge.svg)](https://github.com/Ansvar-Systems/icelandic-law-mcp/actions/workflows/semgrep.yml)
[![Trivy](https://github.com/Ansvar-Systems/icelandic-law-mcp/actions/workflows/trivy.yml/badge.svg)](https://github.com/Ansvar-Systems/icelandic-law-mcp/actions/workflows/trivy.yml)
[![Gitleaks](https://github.com/Ansvar-Systems/icelandic-law-mcp/actions/workflows/gitleaks.yml/badge.svg)](https://github.com/Ansvar-Systems/icelandic-law-mcp/actions/workflows/gitleaks.yml)
[![Socket Security](https://github.com/Ansvar-Systems/icelandic-law-mcp/actions/workflows/socket-security.yml/badge.svg)](https://github.com/Ansvar-Systems/icelandic-law-mcp/actions/workflows/socket-security.yml)
[![OSSF Scorecard](https://github.com/Ansvar-Systems/icelandic-law-mcp/actions/workflows/ossf-scorecard.yml/badge.svg)](https://github.com/Ansvar-Systems/icelandic-law-mcp/actions/workflows/ossf-scorecard.yml)

MCP server for Icelandic statutes with section-level retrieval, citation parsing/validation, and EU cross-reference tools.

## Current Free-Tier Snapshot (2026-02-15)

Latest successful full ingestion/build from official Althingi Lagasafn:

- Source ZIP: <https://www.althingi.is/lagasafn/zip/nuna/allt.zip>
- ZIP last-modified (from source headers): `Mon, 06 Oct 2025 16:45:51 GMT`
- Seed generation stats:
  - scanned HTML files: `1724`
  - parsed laws: `1714`
  - written statute seed files: `1709`
  - duplicate law IDs merged deterministically: `5`
- Built free DB contents:
  - `legal_documents`: `1709`
  - `legal_provisions`: `19026`
  - `legal_provision_versions`: `19026`
  - `case_law`: `0`
  - `preparatory_works`: `0`
  - `eu_documents`: `4` (baseline catalog)
  - `eu_references`: `0`

Scope note: the free build is production-ready for statute retrieval/search/citation workflows, while case law, preparatory works, and detailed EU reference mappings remain out of scope in this public free dataset.

## Identity

- npm package: `@ansvar/icelandic-law-mcp`
- MCP name: `eu.ansvar/icelandic-law-mcp`
- `server.json` name: `eu.ansvar/icelandic-law-mcp`

## Data Sources

This project ingests official Icelandic legal publication channels:

- Althingi Lagasafn: <https://www.althingi.is/lagasafn/>
- Snapshot ZIP endpoint used for deterministic ingestion: <https://www.althingi.is/lagasafn/zip/nuna/allt.zip>
- Additional official references: <https://www.althingi.is/> and <https://www.stjornartidindi.is/>

Source and reuse terms are documented in `LEGAL_DATA_LICENSE.md`.

## Core Commands

```bash
npm ci
npm run ingest
npm run build:db
npm run build
npm test
```

Validation gate run (2026-02-15):

```bash
npm ci
npm run ingest:all
npm run build:db
npm run build
npm test
npm run check-updates
gitleaks detect --source . --report-format sarif --report-path gitleaks.sarif --no-git
```

### Database Tiers

- `npm run build:db`
  - Destructive rebuild from `data/seed/**`
  - Produces baseline DB and `db_metadata` with `tier=free`
- `npm run build:db:paid`
  - Additive schema extension on top of existing DB
  - Preserves base data, updates `db_metadata` to `tier=professional`

## Daily Updates

- Workflow: `.github/workflows/check-updates.yml`
- Schedule: daily
- Behavior:
  - runs freshness check against official source
  - regenerates seeds + rebuilds DB when newer source detected
  - opens automated PR with refreshed corpus

## Security and Supply Chain

This repo includes workflows for:

- CodeQL
- Semgrep
- Trivy
- Gitleaks
- Socket Security
- OSSF Scorecard

Publish workflow uses npm provenance attestation.

## Local Usage

```bash
npx @ansvar/icelandic-law-mcp
```

Or configure in an MCP client using stdio with package `@ansvar/icelandic-law-mcp`.

## Environment

- `ICELANDIC_LAW_DB_PATH` (optional): override database path
