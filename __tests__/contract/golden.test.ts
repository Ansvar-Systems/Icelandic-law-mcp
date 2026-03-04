/**
 * Golden contract tests for Icelandic Law MCP.
 *
 * Runs assertions from fixtures/golden-tests.json against the actual MCP server
 * using InMemoryTransport (no network, no stdio).
 *
 * Requires ICELANDIC_LAW_DB_PATH to point to a valid database.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Database from '@ansvar/mcp-sqlite';
import { readFileSync, rmdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { searchLegislation, type SearchLegislationInput } from '../../src/tools/search-legislation.js';
import { getProvision, type GetProvisionInput } from '../../src/tools/get-provision.js';
import { searchCaseLaw, type SearchCaseLawInput } from '../../src/tools/search-case-law.js';
import { getPreparatoryWorks, type GetPreparatoryWorksInput } from '../../src/tools/get-preparatory-works.js';
import { validateCitationTool, type ValidateCitationInput } from '../../src/tools/validate-citation.js';
import { buildLegalStance, type BuildLegalStanceInput } from '../../src/tools/build-legal-stance.js';
import { formatCitationTool, type FormatCitationInput } from '../../src/tools/format-citation.js';
import { checkCurrency, type CheckCurrencyInput } from '../../src/tools/check-currency.js';
import { getEUBasis, type GetEUBasisInput } from '../../src/tools/get-eu-basis.js';
import {
  getIcelandicImplementations,
  type GetIcelandicImplementationsInput,
} from '../../src/tools/get-icelandic-implementations.js';
import { searchEUImplementations, type SearchEUImplementationsInput } from '../../src/tools/search-eu-implementations.js';
import { getProvisionEUBasis, type GetProvisionEUBasisInput } from '../../src/tools/get-provision-eu-basis.js';
import { validateEUCompliance, type ValidateEUComplianceInput } from '../../src/tools/validate-eu-compliance.js';
import { getAbout, type AboutContext } from '../../src/tools/about.js';

const __dirname2 = dirname(fileURLToPath(import.meta.url));

interface GoldenTest {
  id: string;
  category: string;
  description: string;
  tool: string;
  input: Record<string, unknown>;
  assertions: {
    result_not_empty?: boolean;
    fields_present?: string[];
    min_results?: number;
    handles_gracefully?: boolean;
  };
}

interface GoldenTestsFile {
  tests: GoldenTest[];
}

const DB_PATH = process.env.ICELANDIC_LAW_DB_PATH
  || join(__dirname2, '..', '..', 'data', 'database.db');

const goldenTests: GoldenTestsFile = JSON.parse(
  readFileSync(join(__dirname2, '..', '..', 'fixtures', 'golden-tests.json'), 'utf-8'),
);

let db: InstanceType<typeof Database>;
let server: Server;
let client: Client;

const aboutContext: AboutContext = {
  version: '1.0.0',
  fingerprint: 'test',
  dbBuilt: new Date().toISOString(),
};

function createServer(database: InstanceType<typeof Database>): Server {
  const srv = new Server(
    { name: 'icelandic-law-test', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  srv.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [],
  }));

  srv.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: unknown;

      switch (name) {
        case 'search_legislation':
          result = await searchLegislation(database, args as unknown as SearchLegislationInput);
          break;
        case 'get_provision':
          result = await getProvision(database, args as unknown as GetProvisionInput);
          break;
        case 'search_case_law':
          result = await searchCaseLaw(database, args as unknown as SearchCaseLawInput);
          break;
        case 'get_preparatory_works':
          result = await getPreparatoryWorks(database, args as unknown as GetPreparatoryWorksInput);
          break;
        case 'validate_citation':
          result = await validateCitationTool(database, args as unknown as ValidateCitationInput);
          break;
        case 'build_legal_stance':
          result = await buildLegalStance(database, args as unknown as BuildLegalStanceInput);
          break;
        case 'format_citation':
          result = await formatCitationTool(args as unknown as FormatCitationInput);
          break;
        case 'check_currency':
          result = await checkCurrency(database, args as unknown as CheckCurrencyInput);
          break;
        case 'get_eu_basis':
          result = await getEUBasis(database, args as unknown as GetEUBasisInput);
          break;
        case 'get_icelandic_implementations':
        case 'get_swedish_implementations':
          result = await getIcelandicImplementations(
            database,
            args as unknown as GetIcelandicImplementationsInput,
          );
          break;
        case 'search_eu_implementations':
          result = await searchEUImplementations(database, args as unknown as SearchEUImplementationsInput);
          break;
        case 'get_provision_eu_basis':
          result = await getProvisionEUBasis(database, args as unknown as GetProvisionEUBasisInput);
          break;
        case 'validate_eu_compliance':
          result = await validateEUCompliance(database, args as unknown as ValidateEUComplianceInput);
          break;
        case 'about':
          result = getAbout(database, aboutContext);
          break;
        default:
          return {
            content: [{ type: 'text' as const, text: `Error: Unknown tool "${name}".` }],
            isError: true,
          };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: `Error executing ${name}: ${message}` }],
        isError: true,
      };
    }
  });

  return srv;
}

describe('Golden contract tests', () => {
  beforeAll(async () => {
    try { rmdirSync(DB_PATH + '.lock'); } catch { /* ignore */ }
    db = new Database(DB_PATH, { readonly: true });
    db.pragma('foreign_keys = ON');

    server = createServer(db);
    client = new Client({ name: 'test-client', version: '1.0.0' }, {});

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  }, 30_000);

  afterAll(async () => {
    await client.close();
    await server.close();
    db.close();
  });

  for (const test of goldenTests.tests) {
    it(`[${test.id}] ${test.description}`, async () => {
      const response = await client.callTool({
        name: test.tool,
        arguments: test.input,
      });

      const textContent = response.content as Array<{ type: string; text: string }>;
      expect(textContent).toBeDefined();
      expect(textContent.length).toBeGreaterThan(0);

      const text = textContent[0].text;

      if (test.assertions.handles_gracefully) {
        // For negative tests: must not throw (we got a response) and should not be an unhandled crash
        // It's OK if isError is true with a graceful message, or if it returns empty results
        expect(text).toBeDefined();
        return;
      }

      // Parse the response
      const parsed = JSON.parse(text);

      if (test.assertions.result_not_empty) {
        expect(parsed).toBeTruthy();
        // Should not be an error message
        expect(response.isError).toBeFalsy();
      }

      if (test.assertions.fields_present) {
        for (const field of test.assertions.fields_present) {
          expect(parsed).toHaveProperty(field);
        }
      }

      if (test.assertions.min_results !== undefined) {
        // Check results array or results object with items
        const results = parsed.results ?? parsed;
        if (Array.isArray(results)) {
          expect(results.length).toBeGreaterThanOrEqual(test.assertions.min_results);
        } else if (results.provisions && Array.isArray(results.provisions)) {
          expect(results.provisions.length).toBeGreaterThanOrEqual(test.assertions.min_results);
        } else if (results.results && Array.isArray(results.results)) {
          expect(results.results.length).toBeGreaterThanOrEqual(test.assertions.min_results);
        }
      }
    });
  }
});
