/**
 * Tool registry for Icelandic Legal Citation MCP Server.
 * Single source of truth — shared between stdio (index.ts) and HTTP (api/mcp.ts).
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import Database from '@ansvar/mcp-sqlite';

import { searchLegislation, SearchLegislationInput } from './search-legislation.js';
import { getProvision, GetProvisionInput } from './get-provision.js';
import { searchCaseLaw, SearchCaseLawInput } from './search-case-law.js';
import { getPreparatoryWorks, GetPreparatoryWorksInput } from './get-preparatory-works.js';
import { validateCitationTool, ValidateCitationInput } from './validate-citation.js';
import { buildLegalStance, BuildLegalStanceInput } from './build-legal-stance.js';
import { formatCitationTool, FormatCitationInput } from './format-citation.js';
import { checkCurrency, CheckCurrencyInput } from './check-currency.js';
import { getEUBasis, GetEUBasisInput } from './get-eu-basis.js';
import { getIcelandicImplementations, GetIcelandicImplementationsInput } from './get-icelandic-implementations.js';
import { searchEUImplementations, SearchEUImplementationsInput } from './search-eu-implementations.js';
import { getProvisionEUBasis, GetProvisionEUBasisInput } from './get-provision-eu-basis.js';
import { validateEUCompliance, ValidateEUComplianceInput } from './validate-eu-compliance.js';
import { getAbout, type AboutContext } from './about.js';
import { listSources } from './list-sources.js';
export type { AboutContext } from './about.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions — Icelandic legal conventions
// ─────────────────────────────────────────────────────────────────────────────

export const CORE_TOOLS: Tool[] = [
  {
    name: 'search_legislation',
    description: `Search Icelandic statutes (lög) and regulations by keyword.

Searches provision text using FTS5 full-text search with BM25 ranking. Supports boolean operators (AND, OR, NOT), phrase search ("exact phrase"), and prefix matching (term*).

Returns matched provisions with snippets, relevance scores, and document metadata. Icelandic law numbers use the format number/year (e.g., "90/2018" for Persónuverndarlög).

When NOT to use: If you already know the exact law number and provision, use get_provision instead.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query in Icelandic or English. Supports FTS5 syntax (e.g., "persónuupplýsingar", "réttindi AND friðhelgi").' },
        document_id: { type: 'string', description: 'Filter to a specific statute by law number (e.g., "90/2018" for Persónuverndarlög)' },
        status: { type: 'string', enum: ['in_force', 'amended', 'repealed'], description: 'Filter by document status' },
        as_of_date: { type: 'string', description: 'Optional historical date filter (YYYY-MM-DD). Returns provisions valid on that date.' },
        limit: { type: 'number', description: 'Maximum results (default: 10, max: 50)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_provision',
    description: `Retrieve a specific provision (grein) from an Icelandic statute.

Specify the law number and either section or provision_ref directly. Icelandic statutes identify provisions by article number (grein, abbreviated "gr.").

Examples:
  - document_id="33/1944", section="1" → 1. gr. Stjórnarskrá (Constitution Art. 1)
  - document_id="90/2018", section="14" → 14. gr. Persónuverndarlög
  - document_id="90/2018", provision_ref="14" → same result

Omit section/provision_ref to retrieve all provisions in the statute.`,
    inputSchema: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: 'Law number (e.g., "90/2018" for Persónuverndarlög, "33/1944" for Stjórnarskrá)' },
        chapter: { type: 'string', description: 'Chapter number, if the statute uses chapters.' },
        section: { type: 'string', description: 'Article/section number (e.g., "14", "5 a")' },
        provision_ref: { type: 'string', description: 'Direct provision reference (e.g., "14" or "3:5" for chapter 3, article 5)' },
        as_of_date: { type: 'string', description: 'Optional historical date (YYYY-MM-DD). Returns the provision text valid on that date.' },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'search_case_law',
    description: `Search Icelandic court decisions (dómar).

Searches case summaries and keywords from Icelandic courts. Filter by court and date range. Court codes: Hæstiréttur (Supreme Court) = "HRD", Landsréttur (Court of Appeals) = "LR".

Note: Case law coverage depends on the database tier. The free community tier may have limited case law.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for case law summaries (Icelandic or English)' },
        court: { type: 'string', description: 'Filter by court (e.g., "HRD" for Hæstiréttur, "LR" for Landsréttur)' },
        date_from: { type: 'string', description: 'Start date filter (ISO 8601, e.g., "2020-01-01")' },
        date_to: { type: 'string', description: 'End date filter (ISO 8601)' },
        limit: { type: 'number', description: 'Maximum results (default: 10, max: 50)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_preparatory_works',
    description: `Get preparatory works (löggjafarsaga) for an Icelandic statute.

Returns linked parliamentary documents — bills (frumvörp), committee reports (nefndarálit), and debate records (þingfundur) — with summaries. Essential for understanding legislative intent behind statutory provisions.`,
    inputSchema: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: 'Law number of the statute (e.g., "90/2018")' },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'validate_citation',
    description: `Validate an Icelandic legal citation against the database.

Parses the citation, checks that the document and provision exist, and returns warnings about status (repealed, amended). This is the zero-hallucination enforcer — never generates citations, only validates against verified data.

Supported Icelandic citation formats:
  - "L. nr. 90/2018" (full statute reference)
  - "90/2018 14. gr." (statute with article)
  - "33/1944" (Constitution by law number)
  - "HRD 2020 bls. 1234" (Supreme Court decision)

Also supports legacy Nordic formats for cross-referencing.`,
    inputSchema: {
      type: 'object',
      properties: {
        citation: { type: 'string', description: 'Citation string to validate (e.g., "L. nr. 90/2018 14. gr." or "90/2018")' },
      },
      required: ['citation'],
    },
  },
  {
    name: 'build_legal_stance',
    description: `Build a comprehensive set of citations for a legal question.

Searches across statutes, case law, and preparatory works simultaneously to aggregate relevant Icelandic legal citations. Use this for broad legal research questions where you need a holistic view of the legal position.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Legal question or topic to research (e.g., "persónuvernd starfsmanna")' },
        document_id: { type: 'string', description: 'Optionally limit statute search to one law number' },
        include_case_law: { type: 'boolean', description: 'Include case law results (default: true)' },
        include_preparatory_works: { type: 'boolean', description: 'Include preparatory works results (default: true)' },
        as_of_date: { type: 'string', description: 'Optional historical date (YYYY-MM-DD) for time-aware retrieval.' },
        limit: { type: 'number', description: 'Max results per category (default: 5, max: 20)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'format_citation',
    description: `Format an Icelandic legal citation per standard conventions.

Formats:
  - full: "L. nr. 90/2018 14. gr."
  - short: "90/2018 14. gr."
  - pinpoint: "14. gr."`,
    inputSchema: {
      type: 'object',
      properties: {
        citation: { type: 'string', description: 'Citation string to format' },
        format: { type: 'string', enum: ['full', 'short', 'pinpoint'], description: 'Output format (default: "full")' },
      },
      required: ['citation'],
    },
  },
  {
    name: 'check_currency',
    description: `Check if an Icelandic statute or provision is currently in force.

Returns the document's status (in_force, amended, repealed, not_yet_in_force), effective dates, and any warnings. Provide as_of_date for historical evaluation of in-force status.`,
    inputSchema: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: 'Law number (e.g., "90/2018")' },
        provision_ref: { type: 'string', description: 'Optional provision reference to check (e.g., "14")' },
        as_of_date: { type: 'string', description: 'Optional historical date (YYYY-MM-DD). Computes in-force status as of that date.' },
      },
      required: ['document_id'],
    },
  },
];

export const EU_TOOLS: Tool[] = [
  {
    name: 'get_eu_basis',
    description: `Get EU legal basis (directives and regulations) for an Icelandic statute.

Returns all EU directives and regulations that this statute implements, supplements, or references. Iceland implements EU law through the EEA Agreement. Includes reference types, article citations, and whether each EU document is a primary implementation.

Essential for understanding which EU law an Icelandic statute is based on.`,
    inputSchema: {
      type: 'object',
      properties: {
        law_number: { type: 'string', description: 'Icelandic law number (e.g., "90/2018" for Persónuverndarlög)' },
        include_articles: { type: 'boolean', description: 'Include specific EU article references (default: false)' },
        reference_types: { type: 'array', items: { type: 'string' }, description: 'Filter by reference type (implements, supplements, applies, etc.)' },
      },
      required: [],
    },
  },
  {
    name: 'get_icelandic_implementations',
    description: `Find Icelandic statutes implementing a specific EU directive or regulation.

Given an EU document ID (e.g., "regulation:2016/679" for GDPR), returns all Icelandic statutes that implement, supplement, or reference it. Shows implementation status and which articles are referenced.

Essential for finding Icelandic law corresponding to EU requirements via the EEA Agreement.`,
    inputSchema: {
      type: 'object',
      properties: {
        eu_document_id: { type: 'string', description: 'EU document ID (e.g., "regulation:2016/679" for GDPR, "directive:2016/1148" for NIS)' },
        primary_only: { type: 'boolean', description: 'Return only primary implementing statutes (default: false)' },
        in_force_only: { type: 'boolean', description: 'Return only in-force statutes (default: false)' },
      },
      required: ['eu_document_id'],
    },
  },
  {
    name: 'search_eu_implementations',
    description: `Search for EU directives and regulations with Icelandic implementation information.

Search by keyword, type, year range, or community. Returns matching EU documents with counts of Icelandic statutes referencing them.

Use this for exploratory searches like "data protection" or "privacy" to find relevant EU law and its Icelandic implementations.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keyword search (title, short name, CELEX number, description)' },
        type: { type: 'string', enum: ['directive', 'regulation'], description: 'Filter by document type' },
        year_from: { type: 'number', description: 'Filter by year (from)' },
        year_to: { type: 'number', description: 'Filter by year (to)' },
        community: { type: 'string', enum: ['EU', 'EG', 'EEG', 'Euratom'], description: 'Filter by community' },
        has_icelandic_implementation: { type: 'boolean', description: 'Only return EU documents with Icelandic implementing legislation' },
        limit: { type: 'number', description: 'Maximum results (default: 20, max: 100)' },
      },
    },
  },
  {
    name: 'get_provision_eu_basis',
    description: `Get EU legal basis for a specific provision within an Icelandic statute.

Returns EU directives/regulations that a specific provision implements or references, with article-level precision. For example, a specific article of Persónuverndarlög may reference GDPR Article 6.1.c.

Use this for pinpoint EU compliance checks at the provision level.`,
    inputSchema: {
      type: 'object',
      properties: {
        law_number: { type: 'string', description: 'Icelandic law number (e.g., "90/2018")' },
        provision_ref: { type: 'string', description: 'Provision reference (e.g., "14" or "3:5")' },
      },
      required: ['provision_ref'],
    },
  },
  {
    name: 'validate_eu_compliance',
    description: `Validate EU compliance status for an Icelandic statute or provision.

Checks for:
- References to repealed EU directives
- Missing implementation status
- Outdated references

Returns compliance status (compliant, partial, unclear, not_applicable) with warnings and recommendations.

Note: This is Phase 1 validation based on reference metadata. Full compliance checking against EU requirements will be added in future phases.`,
    inputSchema: {
      type: 'object',
      properties: {
        law_number: { type: 'string', description: 'Icelandic law number (e.g., "90/2018")' },
        provision_ref: { type: 'string', description: 'Optional provision reference (e.g., "14")' },
        eu_document_id: { type: 'string', description: 'Optional: check compliance with specific EU document' },
      },
      required: [],
    },
  },
];

const ABOUT_TOOL: Tool = {
  name: 'about',
  description:
    'Server metadata, dataset statistics, freshness, and provenance. ' +
    'Call this to verify data coverage, currency, and content basis before relying on results.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

const LIST_SOURCES_TOOL: Tool = {
  name: 'list_sources',
  description:
    'List all data sources used by this server, including provenance, update frequency, and license information. ' +
    'Call this to understand where the data comes from and how current it is.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Build & register
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if the database has any EU reference data.
 * EU tools are only exposed when the eu_references table has rows.
 */
function hasEUReferenceData(db: InstanceType<typeof Database>): boolean {
  try {
    const row = db.prepare(
      "SELECT COUNT(*) as cnt FROM eu_references"
    ).get() as { cnt: number } | undefined;
    return (row?.cnt ?? 0) > 0;
  } catch {
    return false;
  }
}

export function buildTools(db: InstanceType<typeof Database>, context?: AboutContext): Tool[] {
  const tools: Tool[] = [...CORE_TOOLS];

  if (hasEUReferenceData(db)) {
    tools.push(...EU_TOOLS);
  }

  if (context) {
    tools.push(ABOUT_TOOL);
  }

  tools.push(LIST_SOURCES_TOOL);
  return tools;
}

export function registerTools(
  server: Server,
  db: InstanceType<typeof Database>,
  context?: AboutContext,
): void {
  const allTools = buildTools(db, context);

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: allTools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: unknown;

      switch (name) {
        case 'search_legislation':
          result = await searchLegislation(db, args as unknown as SearchLegislationInput);
          break;
        case 'get_provision':
          result = await getProvision(db, args as unknown as GetProvisionInput);
          break;
        case 'search_case_law':
          result = await searchCaseLaw(db, args as unknown as SearchCaseLawInput);
          break;
        case 'get_preparatory_works':
          result = await getPreparatoryWorks(db, args as unknown as GetPreparatoryWorksInput);
          break;
        case 'validate_citation':
          result = await validateCitationTool(db, args as unknown as ValidateCitationInput);
          break;
        case 'build_legal_stance':
          result = await buildLegalStance(db, args as unknown as BuildLegalStanceInput);
          break;
        case 'format_citation':
          result = await formatCitationTool(args as unknown as FormatCitationInput);
          break;
        case 'check_currency':
          result = await checkCurrency(db, args as unknown as CheckCurrencyInput);
          break;
        case 'get_eu_basis':
          result = await getEUBasis(db, args as unknown as GetEUBasisInput);
          break;
        case 'get_icelandic_implementations':
        case 'get_swedish_implementations':
          result = await getIcelandicImplementations(db, args as unknown as GetIcelandicImplementationsInput);
          break;
        case 'search_eu_implementations':
          result = await searchEUImplementations(db, args as unknown as SearchEUImplementationsInput);
          break;
        case 'get_provision_eu_basis':
          result = await getProvisionEUBasis(db, args as unknown as GetProvisionEUBasisInput);
          break;
        case 'validate_eu_compliance':
          result = await validateEUCompliance(db, args as unknown as ValidateEUComplianceInput);
          break;
        case 'about':
          if (context) {
            result = getAbout(db, context);
          } else {
            return {
              content: [{ type: 'text', text: 'About tool not configured.' }],
              isError: true,
            };
          }
          break;
        case 'list_sources':
          result = listSources(db);
          break;
        default:
          return {
            content: [{ type: 'text', text: `Error: Unknown tool "${name}".` }],
            isError: true,
          };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error executing ${name}: ${message}` }],
        isError: true,
      };
    }
  });
}
