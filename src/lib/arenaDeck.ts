/**
 * Parser for MTG Arena's clipboard deck export format:
 *
 *   Deck
 *   9 Forest (THB) 254
 *   4 Head of the Hunt (HOB) 75
 *   ...
 *   Sideboard
 *   2 Skullknock Orc (HOB) 101
 *
 * Each card line is "Quantity Name (Set) CollectorNumber". Section headers
 * ("Deck", "Commander", "Sideboard", "Companion") switch the board that
 * following lines are assigned to.
 */
export type DeckBoard = 'main' | 'side' | 'commander' | 'companion';

export interface ParsedCard {
  board: DeckBoard;
  quantity: number;
  name: string;
  setCode: string;
  collectorNumber: string;
}

export interface ParseResult {
  cards: ParsedCard[];
  /** Unrecognised non-empty lines, surfaced to the user as import warnings. */
  errors: string[];
}

const CARD_LINE_RE = /^(\d+)\s+(.+?)\s+\(([0-9A-Za-z]+)\)\s+(\d+[a-zA-Z]?)$/;

const BOARD_BY_HEADER: Record<string, DeckBoard> = {
  deck: 'main',
  commander: 'commander',
  sideboard: 'side',
  companion: 'companion',
};

export function parseArenaDeck(text: string): ParseResult {
  const cards: ParsedCard[] = [];
  const errors: string[] = [];
  let board: DeckBoard = 'main';

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '') continue;

    const header = BOARD_BY_HEADER[line.toLowerCase()];
    if (header) {
      board = header;
      continue;
    }

    const match = CARD_LINE_RE.exec(line);
    if (!match) {
      errors.push(line);
      continue;
    }

    const quantity = Number.parseInt(match[1], 10);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      errors.push(line);
      continue;
    }

    cards.push({
      board,
      quantity,
      name: match[2].trim(),
      setCode: match[3].toUpperCase(),
      collectorNumber: match[4],
    });
  }

  return { cards, errors };
}
