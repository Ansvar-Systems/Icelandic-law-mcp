# Data Sources and Authority

This project ingests Icelandic legal texts from official publication channels and builds a deterministic SQLite corpus for MCP retrieval.

## Source Hierarchy

## 1. Official Government Sources (Primary)

### Althingi Lagasafn

- URL: <https://www.althingi.is/lagasafn/>
- Snapshot ZIP used in ingestion: <https://www.althingi.is/lagasafn/zip/nuna/allt.zip>
- Authority: Official consolidated Icelandic law publication
- Used for:
  - statute text
  - law identifiers (`nr/year`)
  - structure extraction (chapters/articles/sections)
  - source URLs and update metadata

### Althingi

- URL: <https://www.althingi.is/>
- Authority: Official Icelandic Parliament publication channel
- Used for source verification and publication context.

### Stjórnartíðindi

- URL: <https://www.stjornartidindi.is/>
- Authority: Official legal publication register
- Used for promulgation and authenticity cross-checks.

## Data Processing Guarantees

- Ingestion is deterministic (sorted traversal and deterministic output naming).
- Retries, timeout handling, and bounded fetch behavior are implemented in ingestion scripts.
- Seed output is normalized and then compiled into SQLite via `npm run build:db`.

## Currency and Freshness

- `npm run check-updates` compares local DB freshness against official source metadata.
- Daily automation (`.github/workflows/check-updates.yml`) checks for updates and opens an auto-PR when updates are detected.

### Latest Verified Snapshot (2026-02-15)

- Source ZIP: `https://www.althingi.is/lagasafn/zip/nuna/allt.zip`
- Source `Last-Modified`: `Mon, 06 Oct 2025 16:45:51 GMT`
- Ingestion stats (`npm run ingest:all`):
  - `totalFiles`: `1724`
  - `parsedLaws`: `1714`
  - `writtenLaws`: `1709`
  - `duplicateLawIds`: `5`

This snapshot is recorded in `data/seed/_index.json`.

## Licensing and Reuse

Reuse terms, attribution requirements, and policy notes are documented in `LEGAL_DATA_LICENSE.md`.

## Limitations

- This project is a machine-readable transformation layer, not the official legal publication itself.
- Users must verify legally binding text and current status against official publications before legal reliance.
