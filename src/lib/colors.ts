/** MTG's five colors in canonical WUBRG order. */
export const MTG_COLOR_LETTERS = ['W', 'U', 'B', 'R', 'G'] as const;

export type ManaColor = (typeof MTG_COLOR_LETTERS)[number];

export const MTG_COLORS: Record<ManaColor, { name: string }> = {
  W: { name: 'White' },
  U: { name: 'Blue' },
  B: { name: 'Black' },
  R: { name: 'Red' },
  G: { name: 'Green' },
};

/** Splits a stored "GB"-style string into its letters, ignoring anything malformed. */
export function splitColors(colors: string | null | undefined): ManaColor[] {
  if (!colors) return [];
  return MTG_COLOR_LETTERS.filter((letter) => colors.includes(letter));
}

/** Dedupes and orders letters into canonical WUBRG order; null when nothing is selected. */
export function canonicalizeColors(letters: readonly string[]): string | null {
  const kept = MTG_COLOR_LETTERS.filter((letter) => letters.includes(letter));
  return kept.length > 0 ? kept.join('') : null;
}

/** Human-readable list, e.g. "Green · Black", for titles and aria labels. */
export function colorNames(colors: string | null | undefined): string {
  return splitColors(colors)
    .map((letter) => MTG_COLORS[letter].name)
    .join(' · ');
}
