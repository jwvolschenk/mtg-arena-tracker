import { describe, expect, it } from 'vitest';
import { parseArenaDeck } from './arenaDeck';

describe('parseArenaDeck', () => {
  it('parses a plain list of cards with quantities', () => {
    const result = parseArenaDeck('9 Forest (THB) 254\n4 Mirkwood (HOB) 188');

    expect(result.errors).toEqual([]);
    expect(result.cards).toEqual([
      { board: 'main', quantity: 9, name: 'Forest', setCode: 'THB', collectorNumber: '254' },
      { board: 'main', quantity: 4, name: 'Mirkwood', setCode: 'HOB', collectorNumber: '188' },
    ]);
  });

  it('parses a real Arena export with the Deck header', () => {
    const text = [
      'Deck',
      '9 Forest (THB) 254',
      '4 Mirkwood (HOB) 188',
      "3 Bilbo's Deadly Slice (HOB) 62",
      '4 Chief Warg\'s Company (HOB) 151',
      '3 My Precious (HOB) 176',
    ].join('\n');

    const result = parseArenaDeck(text);

    expect(result.errors).toEqual([]);
    expect(result.cards).toHaveLength(5);
    expect(result.cards.every((card) => card.board === 'main')).toBe(true);
    expect(result.cards[2]).toEqual({
      board: 'main',
      quantity: 3,
      name: "Bilbo's Deadly Slice",
      setCode: 'HOB',
      collectorNumber: '62',
    });
  });

  it('handles CRLF line endings from a Windows clipboard', () => {
    const result = parseArenaDeck('Deck\r\n4 Mirkwood (HOB) 188\r\n');

    expect(result.errors).toEqual([]);
    expect(result.cards).toEqual([
      { board: 'main', quantity: 4, name: 'Mirkwood', setCode: 'HOB', collectorNumber: '188' },
    ]);
  });

  it('assigns sections after Commander / Sideboard / Companion headers', () => {
    const text = [
      'Commander',
      '1 The Chief Warg (HOB) 150',
      'Deck',
      '4 Head of the Hunt (HOB) 75',
      'Sideboard',
      '2 Ravening Warg (HOB) 80',
      'Companion',
      '1 Bejeweled Warg (HOB) 117',
    ].join('\n');

    const result = parseArenaDeck(text);

    expect(result.errors).toEqual([]);
    expect(result.cards.map((card) => card.board)).toEqual([
      'commander',
      'main',
      'side',
      'companion',
    ]);
  });

  it('is case-insensitive about section headers', () => {
    const result = parseArenaDeck('sideboard\n1 Forest (THB) 254');

    expect(result.cards[0]?.board).toBe('side');
  });

  it('keeps split-card names intact', () => {
    const result = parseArenaDeck('2 Fire // Ice (STA) 56');

    expect(result.cards[0]).toEqual({
      board: 'main',
      quantity: 2,
      name: 'Fire // Ice',
      setCode: 'STA',
      collectorNumber: '56',
    });
  });

  it('ignores blank lines but collects unparseable lines as errors', () => {
    const result = parseArenaDeck('\n4 Mirkwood (HOB) 188\n\nthis is not a card\nForest');

    expect(result.cards).toHaveLength(1);
    expect(result.errors).toEqual(['this is not a card', 'Forest']);
  });

  it('rejects absurd quantities as errors', () => {
    const result = parseArenaDeck('0 Forest (THB) 254\n999 Forest (THB) 254');

    expect(result.cards).toHaveLength(0);
    expect(result.errors).toHaveLength(2);
  });

  it('accepts collector numbers with a letter suffix', () => {
    const result = parseArenaDeck('1 Emry, Lurker of the Loch (ELD) 220');

    expect(result.cards[0]).toEqual({
      board: 'main',
      quantity: 1,
      name: 'Emry, Lurker of the Loch',
      setCode: 'ELD',
      collectorNumber: '220',
    });
  });
});
