const MONTH_ALIASES: Array<[RegExp, string]> = [
  [/\b(?:january|jan)\b/gi, 'm01'],
  [/\b(?:february|feb)\b/gi, 'm02'],
  [/\b(?:march|mar)\b/gi, 'm03'],
  [/\b(?:april|apr)\b/gi, 'm04'],
  [/\bmay\b/gi, 'm05'],
  [/\b(?:june|jun)\b/gi, 'm06'],
  [/\b(?:july|jul)\b/gi, 'm07'],
  [/\b(?:august|aug)\b/gi, 'm08'],
  [/\b(?:september|sept|sep)\b/gi, 'm09'],
  [/\b(?:october|oct)\b/gi, 'm10'],
  [/\b(?:november|nov)\b/gi, 'm11'],
  [/\b(?:december|dec)\b/gi, 'm12'],
];

/**
 * Normalizes presentation-only differences in Fluent Forms option labels while
 * retaining every meaningful date, time, and meridiem token.
 */
export function normalizeFluentFormOptionText(value: string) {
  let normalized = String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/\b(\d+)(?:st|nd|rd|th)\b/g, '$1')
    .replace(/\ba\.?\s*m\.?\b/g, 'am')
    .replace(/\bp\.?\s*m\.?\b/g, 'pm')
    .replace(/\bto\b/g, '-');

  for (const [pattern, replacement] of MONTH_ALIASES) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized.replace(/[^a-z0-9]+/g, '');
}

export function findFluentFormOptionMapping<T extends { sourceOptionText: string }>(
  mappings: T[],
  optionText: string
) {
  const exactMatch = mappings.find((mapping) => mapping.sourceOptionText.trim() === optionText.trim());
  if (exactMatch) return exactMatch;

  const normalizedOption = normalizeFluentFormOptionText(optionText);
  if (!normalizedOption) return undefined;

  return mappings.find(
    (mapping) => normalizeFluentFormOptionText(mapping.sourceOptionText) === normalizedOption
  );
}

