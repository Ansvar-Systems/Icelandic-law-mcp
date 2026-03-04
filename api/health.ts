import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'fs';
import { join } from 'path';

const REPO_URL = 'https://github.com/Ansvar-Systems/icelandic-law-mcp';
const FRESHNESS_MAX_DAYS = 30;

const pkgVersion: string = (() => {
  try { return JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8')).version; }
  catch { return '1.0.0'; }
})();

export default function handler(req: VercelRequest, res: VercelResponse) {
  const url = new URL(req.url ?? '/', `https://${req.headers.host}`);

  if (url.pathname === '/version' || url.searchParams.has('version')) {
    res.status(200).json({
      name: 'icelandic-legal-citations',
      version: pkgVersion,
      node_version: process.version,
      transport: ['stdio', 'streamable-http'],
      capabilities: ['statutes', 'eu_cross_references'],
      tier: 'free',
      source_schema_version: '1.0',
      repo_url: REPO_URL,
      report_issue_url: `${REPO_URL}/issues/new?template=data-error.md`,
    });
    return;
  }

  res.status(200).json({
    status: 'ok',
    server: 'icelandic-legal-citations',
    version: pkgVersion,
    uptime_seconds: Math.floor(process.uptime()),
    data_freshness: {
      max_age_days: FRESHNESS_MAX_DAYS,
      note: 'Serving bundled free-tier database',
    },
    capabilities: ['statutes', 'eu_cross_references'],
    tier: 'free',
  });
}
