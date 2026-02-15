/**
 * Utilities for building robust FTS5 queries from natural-language input.
 *
 * If the user provides explicit FTS syntax (quotes, boolean operators, wildcards),
 * we preserve it. Otherwise we convert tokens to prefix terms so inflections like
 * "make" -> "maken" can match.
 */

import { buildIcelandicTokenVariants } from './icelandic-normalization.js';

const EXPLICIT_FTS_SYNTAX_PATTERN = /["*():^]|\bAND\b|\bOR\b|\bNOT\b/iu;

function sanitizeToken(token: string): string {
  return token.replace(/[^\p{L}\p{N}_]/gu, '');
}

function extractTokens(query: string): string[] {
  const matches = query.normalize('NFC').match(/[\p{L}\p{N}_]+/gu) ?? [];
  return matches
    .map(sanitizeToken)
    .filter(token => token.length > 1);
}

function escapeExplicitQuery(query: string): string {
  return query.replace(/[()^:]/g, (char) => `"${char}"`);
}

function buildPrefixAndQuery(tokens: string[]): string {
  return tokens.map(token => `${token}*`).join(' ');
}

function buildPrefixOrQuery(tokens: string[]): string {
  return tokens.map(token => `${token}*`).join(' OR ');
}

function buildSearchTokenSet(tokens: string[]): string[] {
  const set = new Set<string>();
  for (const token of tokens) {
    const variants = buildIcelandicTokenVariants(token);
    for (const variant of variants) {
      if (variant.length > 1) {
        set.add(variant);
      }
    }
  }
  return Array.from(set);
}

export interface FtsQueryVariants {
  primary: string;
  fallback?: string;
}

export function buildFtsQueryVariants(query: string): FtsQueryVariants {
  const trimmed = query.trim();
  if (!trimmed) {
    return { primary: '' };
  }

  if (EXPLICIT_FTS_SYNTAX_PATTERN.test(trimmed)) {
    return { primary: escapeExplicitQuery(trimmed) };
  }

  const tokens = extractTokens(trimmed);
  if (tokens.length === 0) {
    return { primary: escapeExplicitQuery(trimmed) };
  }

  const primary = buildPrefixAndQuery(tokens);
  const variantTokens = buildSearchTokenSet(tokens);

  const hasVariantExpansion =
    variantTokens.length !== tokens.length ||
    variantTokens.some(token => !tokens.includes(token));

  if (tokens.length === 1 && !hasVariantExpansion) {
    return { primary };
  }

  return {
    primary,
    fallback: buildPrefixOrQuery(hasVariantExpansion ? variantTokens : tokens),
  };
}
