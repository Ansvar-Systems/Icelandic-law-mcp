# Contributing

## Prerequisites

- Node.js 20+
- npm 10+
- Git

## Setup

```bash
git clone https://github.com/Ansvar-Systems/icelandic-law-mcp.git
cd icelandic-law-mcp
npm ci
npm run build
npm test
```

## Development Flow

1. Create a branch
```bash
git checkout -b codex/your-change
```
2. Make changes
3. Run validations
```bash
npm run build:db
npm run build
npm test
npm run check-updates
```
4. Run secret scan
```bash
gitleaks detect --source . --report-format sarif --report-path gitleaks.sarif --no-git
```
5. Commit and open PR

## MCP Tool Changes

When adding or changing tools:

- keep input/output schemas explicit and typed
- update tool registry and server handler wiring together
- preserve backward compatibility aliases when required
- add or update tests under `tests/`

## Data Pipeline Changes

If you change ingestion or DB build logic:

- preserve deterministic seed output
- maintain destructive semantics for `build:db`
- maintain additive semantics for `build:db:paid`
- keep `db_metadata` fields consistent (`tier`, `schema_version`, `built_at`, `builder`)
- update `LEGAL_DATA_LICENSE.md` if source/reuse terms change

## Security Expectations

Contributions should not weaken:

- static analysis workflows (CodeQL/Semgrep)
- dependency and supply-chain scanning (Trivy/Socket/Scorecard)
- secret scanning (Gitleaks)
- publish provenance requirements
