# Icelandic Law MCP Server

**The Lagasafn alternative for the AI age.**

[![npm version](https://badge.fury.io/js/@ansvar%2Ficelandic-law-mcp.svg)](https://www.npmjs.com/package/@ansvar/icelandic-law-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://registry.modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub stars](https://img.shields.io/github/stars/Ansvar-Systems/Icelandic-law-mcp?style=social)](https://github.com/Ansvar-Systems/Icelandic-law-mcp)
[![CI](https://github.com/Ansvar-Systems/Icelandic-law-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/Icelandic-law-mcp/actions/workflows/ci.yml)
[![Daily Data Check](https://github.com/Ansvar-Systems/Icelandic-law-mcp/actions/workflows/check-updates.yml/badge.svg)](https://github.com/Ansvar-Systems/Icelandic-law-mcp/actions/workflows/check-updates.yml)
[![Database](https://img.shields.io/badge/database-pre--built-green)](docs/EU_INTEGRATION_GUIDE.md)
[![Provisions](https://img.shields.io/badge/provisions-19%2C026-blue)](docs/EU_INTEGRATION_GUIDE.md)

Query **1,709 Icelandic statutes** -- from Persónuverndarlög and Almenn hegningarlög to Lyfjalög, Stjórnarskrá, and more -- directly from Claude, Cursor, or any MCP-compatible client.

If you're building legal tech, compliance tools, or doing Icelandic legal research, this is your verified reference database.

Built by [Ansvar Systems](https://ansvar.eu) -- Stockholm, Sweden

---

## Why This Exists

Icelandic legal research is scattered across Althingi, Lagasafn (the official legal gazette), and EUR-Lex. Whether you're:
- A **lawyer** validating citations in a brief or contract
- A **compliance officer** checking if a statute is still in force
- A **legal tech developer** building tools on Icelandic law
- A **researcher** tracing legislative provisions across 1,709 statutes

...you shouldn't need dozens of browser tabs and manual cross-referencing. Ask Claude. Get the exact provision. With context.

This MCP server makes Icelandic law **searchable, cross-referenceable, and AI-readable**.

---

## Quick Start

### Use Remotely (No Install Needed)

> Connect directly to the hosted version -- zero dependencies, nothing to install.

**Endpoint:** `https://icelandic-law-mcp.vercel.app/mcp`

| Client | How to Connect |
|--------|---------------|
| **Claude.ai** | Settings > Connectors > Add Integration > paste URL |
| **Claude Code** | `claude mcp add icelandic-law --transport http https://icelandic-law-mcp.vercel.app/mcp` |
| **Claude Desktop** | Add to config (see below) |
| **GitHub Copilot** | Add to VS Code settings (see below) |

**Claude Desktop** -- add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "icelandic-law": {
      "type": "url",
      "url": "https://icelandic-law-mcp.vercel.app/mcp"
    }
  }
}
```

**GitHub Copilot** -- add to VS Code `settings.json`:

```json
{
  "github.copilot.chat.mcp.servers": {
    "icelandic-law": {
      "type": "http",
      "url": "https://icelandic-law-mcp.vercel.app/mcp"
    }
  }
}
```

### Use Locally (npm)

```bash
npx @ansvar/icelandic-law-mcp
```

**Claude Desktop** -- add to `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "icelandic-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/icelandic-law-mcp"]
    }
  }
}
```

**Cursor / VS Code:**

```json
{
  "mcp.servers": {
    "icelandic-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/icelandic-law-mcp"]
    }
  }
}
```

---

## Example Queries

Once connected, just ask naturally:

- *"Leita að 'persónuvernd' -- hvaða skyldur setur lög nr. 90/2018?"*
- *"Er Almenn hegningarlög enn í gildi?"*
- *"Finna ákvæði um lyfjamál í Lyfjalögum"*
- *"Hvaða reglur ESB eru innleiddar í Stjórnarskrá Íslands?"*
- *"Hvaða íslensk lög innleiða GDPR?"*
- *"Staðfesta tilvísun: lög nr. 90/2018, 6. gr."*
- *"Búa til lagalega afstöðu varðandi gagnavernd"*
- *"Uppfylla kröfur NIS2 tilskipunarinnar í íslenskum rétti?"*

---

## What's Included

| Category | Count | Details |
|----------|-------|---------|
| **Statutes** | 1,709 statutes | Comprehensive Icelandic legislation from Lagasafn |
| **Provisions** | 19,026 sections | Full-text searchable with FTS5 |
| **EU Cross-References** | Included | EEA-incorporated directives and regulations linked |
| **Database Size** | 68 MB | Optimized SQLite, portable |
| **Daily Updates** | Automated | Freshness checks against Althingi/Lagasafn |

**Verified data only** -- every citation is validated against official sources (Althingi, lagasafn.is). Zero LLM-generated content.

---

## See It In Action

### Why This Works

**Verbatim Source Text (No LLM Processing):**
- All statute text is ingested from Althingi/Lagasafn official sources
- Provisions are returned **unchanged** from SQLite FTS5 database rows
- Zero LLM summarization or paraphrasing -- the database contains statute text, not AI interpretations

**Smart Context Management:**
- Search returns ranked provisions with BM25 scoring (safe for context)
- Provision retrieval gives exact text by statute number + article/section
- Cross-references help navigate without loading everything at once

**Technical Architecture:**
```
Althingi/Lagasafn → Parse → SQLite → FTS5 snippet() → MCP response
                      ↑                      ↑
               Provision parser       Verbatim database query
```

### Traditional Research vs. This MCP

| Traditional Approach | This MCP Server |
|---------------------|-----------------|
| Search Lagasafn by statute number | Search by plain Icelandic: *"persónuvernd samþykki"* |
| Navigate multi-chapter statutes manually | Get the exact provision with context |
| Manual cross-referencing between laws | `build_legal_stance` aggregates across sources |
| "Is this statute still in force?" → check manually | `check_currency` tool → answer in seconds |
| Find EEA/EU basis → dig through EUR-Lex | `get_eu_basis` → linked EU acts instantly |
| Check multiple sites for updates | Daily automated freshness checks |
| No API, no integration | MCP protocol → AI-native |

**Traditional:** Search Lagasafn → Download PDF → Ctrl+F → Cross-reference → Check EUR-Lex for EEA basis → Repeat

**This MCP:** *"Hvaða ESB-reglur eru grundvöllur laga nr. 90/2018 um persónuvernd?"* → Done.

---

## Available Tools (13)

### Core Legal Research Tools (8)

| Tool | Description |
|------|-------------|
| `search_legislation` | FTS5 full-text search across 19,026 provisions with BM25 ranking |
| `get_provision` | Retrieve specific provision by statute number + article/section |
| `validate_citation` | Validate citation against database -- zero-hallucination check |
| `build_legal_stance` | Aggregate citations from multiple statutes for a legal topic |
| `format_citation` | Format citations per Icelandic conventions (full/short/pinpoint) |
| `check_currency` | Check if statute is in force, amended, or repealed |
| `list_sources` | List all available statutes with metadata and data provenance |
| `about` | Server info, capabilities, dataset statistics, and coverage summary |

### EU/EEA Law Integration Tools (5)

| Tool | Description |
|------|-------------|
| `get_eu_basis` | Get EU/EEA directives and regulations that underpin an Icelandic statute |
| `get_icelandic_implementations` | Find Icelandic laws implementing a specific EU/EEA act |
| `search_eu_implementations` | Search EU documents with Icelandic implementation counts |
| `get_provision_eu_basis` | Get EU/EEA law references for a specific provision |
| `validate_eu_compliance` | Check implementation status of Icelandic statutes against EEA obligations |

---

## EEA Law Integration

Iceland is an EEA member state but not an EU member. Iceland implements EU law via the EEA Agreement, including GDPR (as Regulation (EU) 2016/679 incorporated into EEA Annex XI), NIS2, and most of the EU single market acquis. This creates a close but distinct relationship with EU law.

Key areas of EEA-Icelandic law integration:

- **GDPR (2016/679)** -- incorporated into EEA Agreement; implemented via lög nr. 90/2018 um persónuvernd og vinnslu persónuupplýsinga
- **NIS2 Directive (2022/2555)** -- incorporated into EEA and implemented in Icelandic cybersecurity legislation
- **eIDAS Regulation (910/2014)** -- incorporated into EEA; supplemented by national e-signature provisions
- **Financial Services Directives** -- MiFID II, Solvency II, and related acts incorporated via EEA Agreement Annex IX
- **Product Safety and Market Surveillance** -- EEA-incorporated regulations apply directly

> **Note:** Iceland, Liechtenstein, and Norway participate in the EU single market via the EEA Agreement. EU acts must be formally incorporated into the EEA Agreement before applying to Iceland. The EU tools in this server reflect EEA-incorporated acts and their Icelandic implementations.

| Metric | Value |
|--------|-------|
| **EEA Member** | Since 1994 |
| **Legal System** | Civil law (Nordic tradition) |
| **Official Legal Gazette** | Lagasafn (lagasafn.is) |
| **Parliament** | Althingi (althingi.is) |
| **EUR-Lex Integration** | Automated metadata fetching (EEA-incorporated acts) |

See [EU_INTEGRATION_GUIDE.md](docs/EU_INTEGRATION_GUIDE.md) for detailed documentation.

---

## Data Sources & Freshness

All content is sourced from authoritative Icelandic legal databases:

- **[Althingi](https://www.althingi.is/)** -- Icelandic Parliament's official legislative database
- **[Lagasafn](https://www.lagasafn.is/)** -- Official Icelandic Legal Gazette (consolidated statutes)
- **[EUR-Lex](https://eur-lex.europa.eu/)** -- Official EU law database (EEA-incorporated acts, metadata only)

### Automated Freshness Checks (Daily)

A [daily GitHub Actions workflow](.github/workflows/check-updates.yml) monitors all data sources:

| Source | Check | Method |
|--------|-------|--------|
| **Statute amendments** | Lagasafn comparison | All 1,709 statutes checked |
| **New statutes** | Althingi publications (90-day window) | Diffed against database |
| **EU/EEA reference staleness** | Git commit timestamps | Flagged if >90 days old |

---

## Security

This project uses multiple layers of automated security scanning:

| Scanner | What It Does | Schedule |
|---------|-------------|----------|
| **CodeQL** | Static analysis for security vulnerabilities | Weekly + PRs |
| **Semgrep** | SAST scanning (OWASP top 10, secrets, TypeScript) | Every push |
| **Gitleaks** | Secret detection across git history | Every push |
| **Trivy** | CVE scanning on filesystem and npm dependencies | Daily |
| **Docker Security** | Container image scanning + SBOM generation | Daily |
| **Socket.dev** | Supply chain attack detection | PRs |
| **OSSF Scorecard** | OpenSSF best practices scoring | Weekly |
| **Dependabot** | Automated dependency updates | Weekly |

See [SECURITY.md](SECURITY.md) for the full policy and vulnerability reporting.

---

## Important Disclaimers

### Legal Advice

> **THIS TOOL IS NOT LEGAL ADVICE**
>
> Statute text is sourced from official Althingi/Lagasafn publications. However:
> - This is a **research tool**, not a substitute for professional legal counsel
> - **Verify critical citations** against primary sources for court filings
> - **EEA/EU cross-references** reflect EEA-incorporated acts; verify current incorporation status
> - **Always confirm** current in-force status via Lagasafn before relying on a provision professionally

**Before using professionally, read:** [DISCLAIMER.md](DISCLAIMER.md) | [PRIVACY.md](PRIVACY.md)

### Client Confidentiality

Queries go through the Claude API. For privileged or confidential matters, use on-premise deployment. See [PRIVACY.md](PRIVACY.md) for Lögmannafélag Íslands (Icelandic Bar Association) compliance guidance.

---

## Documentation

- **[EU Integration Guide](docs/EU_INTEGRATION_GUIDE.md)** -- Detailed EEA/EU cross-reference documentation
- **[EU Usage Examples](docs/EU_USAGE_EXAMPLES.md)** -- Practical EU/EEA lookup examples
- **[Security Policy](SECURITY.md)** -- Vulnerability reporting and scanning details
- **[Disclaimer](DISCLAIMER.md)** -- Legal disclaimers and professional use notices
- **[Privacy](PRIVACY.md)** -- Client confidentiality and data handling

---

## Development

### Setup

```bash
git clone https://github.com/Ansvar-Systems/Icelandic-law-mcp
cd Icelandic-law-mcp
npm install
npm run build
npm test
```

### Running Locally

```bash
npm run dev                                       # Start MCP server
npx @anthropic/mcp-inspector node dist/index.js   # Test with MCP Inspector
```

### Data Management

```bash
npm run ingest              # Ingest statutes from Althingi/Lagasafn
npm run build:db            # Rebuild SQLite database
npm run check-updates       # Check for amendments and new statutes
```

### Performance

- **Search Speed:** <100ms for most FTS5 queries
- **Database Size:** 68 MB (efficient, portable)
- **Reliability:** 100% ingestion success rate

---

## Related Projects: Complete Compliance Suite

This server is part of **Ansvar's Compliance Suite** -- MCP servers that work together for end-to-end compliance coverage:

### [@ansvar/eu-regulations-mcp](https://github.com/Ansvar-Systems/EU_compliance_MCP)
**Query 49 EU regulations directly from Claude** -- GDPR, AI Act, DORA, NIS2, MiFID II, eIDAS, and more. Full regulatory text with article-level search. `npx @ansvar/eu-regulations-mcp`

### @ansvar/icelandic-law-mcp (This Project)
**Query 1,709 Icelandic statutes directly from Claude** -- persónuverndarlög, hegningarlög, lyfjalög, and more. Full provision text with EEA cross-references. `npx @ansvar/icelandic-law-mcp`

### [@ansvar/norwegian-law-mcp](https://github.com/Ansvar-Systems/Norwegian-law-mcp)
**Query Norwegian statutes directly from Claude** -- EEA member, Nordic legal tradition. `npx @ansvar/norwegian-law-mcp`

### [@ansvar/security-controls-mcp](https://github.com/Ansvar-Systems/security-controls-mcp)
**Query 261 security frameworks** -- ISO 27001, NIST CSF, SOC 2, CIS Controls, SCF, and more. `npx @ansvar/security-controls-mcp`

### [@ansvar/sanctions-mcp](https://github.com/Ansvar-Systems/Sanctions-MCP)
**Offline-capable sanctions screening** -- OFAC, EU, UN sanctions lists. `pip install ansvar-sanctions-mcp`

**70+ national law MCPs** covering Australia, Brazil, Canada, Denmark, Finland, France, Germany, Ireland, Lithuania, Netherlands, Norway, Sweden, and more.

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Priority areas:
- EEA incorporation status tracking (which EU acts are in force in Iceland)
- Supreme Court (Hæstiréttur) case law expansion
- Historical statute versions and amendment tracking
- English translations for key statutes

---

## Roadmap

- [x] Core statute database with FTS5 search
- [x] Full corpus ingestion (1,709 statutes, 19,026 provisions)
- [x] EEA/EU law integration tools
- [x] Vercel Streamable HTTP deployment
- [x] npm package publication
- [x] Daily freshness checks
- [ ] Case law expansion (Hæstiréttur, Landsréttur)
- [ ] Historical statute versions (amendment tracking)
- [ ] English translations for key statutes
- [ ] EEA incorporation status tracking

---

## Citation

If you use this MCP server in academic research:

```bibtex
@software{icelandic_law_mcp_2026,
  author = {Ansvar Systems AB},
  title = {Icelandic Law MCP Server: Production-Grade Legal Research Tool},
  year = {2026},
  url = {https://github.com/Ansvar-Systems/Icelandic-law-mcp},
  note = {Comprehensive Icelandic legal database with 1,709 statutes and 19,026 provisions}
}
```

---

## License

Apache License 2.0. See [LICENSE](./LICENSE) for details.

### Data Licenses

- **Statutes & Legislation:** Althingi/Lagasafn (public domain)
- **EU/EEA Metadata:** EUR-Lex (EU public domain)

---

## About Ansvar Systems

We build AI-accelerated compliance and legal research tools for the European market. This MCP server started as our internal reference tool for Icelandic law -- turns out everyone building for the EEA market has the same research frustrations.

So we're open-sourcing it. Navigating 1,709 statutes shouldn't require a law degree.

**[ansvar.eu](https://ansvar.eu)** -- Stockholm, Sweden

---

<p align="center">
  <sub>Built with care in Stockholm, Sweden</sub>
</p>
