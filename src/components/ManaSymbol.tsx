import { MTG_COLORS, type ManaColor } from '@/lib/colors';

/**
 * Stylised mana pips (sun, droplet, skull, flame, tree) drawn as simple
 * SVG glyphs — our own take on the classic symbols, not the official art.
 * Glyphs live on a 24×24 grid inside the pip's circular badge.
 */
const GLYPHS: Record<ManaColor, { bg: string; fg: string; d: string; evenOdd?: boolean }> = {
  W: {
    bg: '#f4f0e6',
    fg: '#8a8168',
    d: 'M12 2 14.45 6.09 19.07 4.93 17.91 9.55 22 12 17.91 14.45 19.07 19.07 14.45 17.91 12 22 9.55 17.91 4.93 19.07 6.09 14.45 2 12 6.09 9.55 4.93 4.93 9.55 6.09Z',
  },
  U: {
    bg: '#0aa1e8',
    fg: '#0b3a56',
    d: 'M12 2.4C9.8 5.6 5.4 10 5.4 14.1a6.6 6.6 0 0 0 13.2 0C18.6 10 14.2 5.6 12 2.4Z',
  },
  B: {
    bg: '#585062',
    fg: '#d8d2de',
    d: 'M12 3.6c-4.6 0-7.9 3-7.9 7.1 0 2.3 1 4.1 2.6 5.3v3.3c0 .9.7 1.6 1.6 1.6h.7l.3-1.9h1.1l.3 1.9h2.6l.3-1.9h1.1l.3 1.9h.7c.9 0 1.6-.7 1.6-1.6v-3.3c1.6-1.2 2.6-3 2.6-5.3 0-4.1-3.3-7.1-7.9-7.1ZM8.9 9.9a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Zm6.2 0a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4ZM12 12.2l1.2 2.4h-2.4Z',
    evenOdd: true,
  },
  R: {
    bg: '#e54c2e',
    fg: '#7a1608',
    d: 'M12 2.2c.8 2.8-.5 4.4-1.8 6-1.2 1.5-2.4 2.8-2.4 4.9a6.2 6.2 0 0 0 12.4 0c0-2-1.1-3.5-2.2-5-.3 1.3-1 2.3-2.2 2.8.6-3-1.3-5.7-3.8-8.7Z',
  },
  G: {
    bg: '#2fa06a',
    fg: '#113f26',
    d: 'M12 2.6 15.5 8H13.3L16.7 12.4H13.8V15.6H10.2V12.4H7.3L10.7 8H8.5L12 2.6ZM11 15.6h2v3.9a1 1 0 0 1-2 0Z',
  },
};

export default function ManaSymbol({
  color,
  size = 14,
  className = '',
}: {
  color: ManaColor;
  size?: number;
  className?: string;
}) {
  const glyph = GLYPHS[color];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={`${MTG_COLORS[color].name} mana`}
      className={`shrink-0 ${className}`}
    >
      <circle cx="12" cy="12" r="11.4" fill={glyph.bg} stroke="rgba(226,232,240,0.45)" strokeWidth="1.4" />
      <path d={glyph.d} fill={glyph.fg} fillRule={glyph.evenOdd ? 'evenodd' : 'nonzero'} />
    </svg>
  );
}
