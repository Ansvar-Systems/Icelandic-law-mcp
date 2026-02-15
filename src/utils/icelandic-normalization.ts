/**
 * Icelandic text normalization helpers used by search/citation flows.
 *
 * The goal is pragmatic matching support, not linguistic perfectness.
 */

const FOLD_MAP: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
  ý: 'y',
  þ: 'th',
  ð: 'd',
  æ: 'ae',
  ö: 'oe',
};

/**
 * Fold Icelandic diacritics and letters to a plain ASCII-ish form for fallback search.
 */
export function foldIcelandic(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[áéíóúýþðæö]/gi, (char) => {
      const lower = char.toLowerCase();
      const folded = FOLD_MAP[lower] ?? lower;
      return char === lower ? folded : folded.toUpperCase();
    });
}

/**
 * Generate common Icelandic transliteration variants for a single token.
 */
export function buildIcelandicTokenVariants(token: string): string[] {
  const base = token.toLowerCase();
  const variants = new Set<string>([token]);

  const folded = foldIcelandic(base);
  if (folded !== base) {
    variants.add(folded);
  }

  // Common ASCII transliterations -> Icelandic forms
  if (base.includes('th')) {
    variants.add(base.replace(/th/g, 'þ'));
  }
  if (base.includes('ae')) {
    variants.add(base.replace(/ae/g, 'æ'));
  }
  if (base.includes('oe')) {
    variants.add(base.replace(/oe/g, 'ö'));
  }

  return Array.from(variants);
}
