# Legal Data Source & Reuse Terms

This repository ingests Icelandic legal texts from official publication channels and stores normalized seed files for deterministic builds.

## Official Sources

1. Althingi Lagasafn (official consolidated law publication)
   - https://www.althingi.is/lagasafn/
   - Snapshot zip used by ingestion:
     - https://www.althingi.is/lagasafn/zip/nuna/allt.zip
2. Althingi related official parliamentary publication channels
   - https://www.althingi.is/
3. Official legal publication register (for promulgation verification)
   - https://www.stjornartidindi.is/

## Reuse Basis

The data is sourced from Icelandic public-sector legal publications. Reuse is handled under Icelandic public information reuse rules and official publication practices, including:

- Lög nr. 45/2018 um endurnýtingu upplýsinga frá hinu opinbera
- Applicable publication and authenticity rules for official law texts

## Project Reuse Policy

1. This project redistributes normalized machine-readable representations of official legal text for search/retrieval.
2. Source links are preserved in seed metadata (`url`) to maintain traceability.
3. No claim is made that this repository replaces official publication authenticity; users must verify against official sources before legal reliance.
4. Server code is licensed under Apache-2.0; underlying legal texts remain subject to Icelandic law and official publication terms.

## Current Public Free Dataset Scope (2026-02-15)

- Included: statute corpus from official Althingi/Lagasafn publication channels.
- Not included in this public free snapshot: case-law archive, preparatory works archive, and provision-level EU reference mappings.
- A minimal baseline EU document catalog is included for tool compatibility in free builds.

## Attribution

When reusing data produced by this project, include attribution to:

- Althingi/Lagasafn as original official source
- This repository as transformation tooling (`@ansvar/icelandic-law-mcp`)
