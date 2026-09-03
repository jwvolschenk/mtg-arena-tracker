import type { ManaColor } from '@/lib/colors';
import ManaSymbol from './ManaSymbol';

/**
 * Renders a Scryfall-style mana cost string ("{2}{B}{G}") as pips: WUBRG
 * get the stylised mana symbols, anything else (generic cost, {X}, hybrids)
 * becomes a compact slate chip.
 */
const COLOR_BY_LETTER: Record<string, ManaColor> = { W: 'W', U: 'U', B: 'B', R: 'R', G: 'G' };

export default function ManaCost({
  cost,
  size = 13,
  className = '',
}: {
  cost: string | null | undefined;
  size?: number;
  className?: string;
}) {
  if (!cost) return null;

  const symbols = cost.match(/\{[^}]+\}/g) ?? [];
  if (symbols.length === 0) return null;

  return (
    <span className={`inline-flex shrink-0 items-center gap-[2px] ${className}`}>
      {symbols.map((symbol, index) => {
        const inner = symbol.slice(1, -1);
        const color = COLOR_BY_LETTER[inner.toUpperCase()];
        if (color) return <ManaSymbol key={index} color={color} size={size} />;
        return (
          <span
            key={index}
            style={{ width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.6)) }}
            className="inline-flex items-center justify-center rounded-full bg-slate-600/90 font-bold text-slate-100 ring-1 ring-white/25"
          >
            {inner}
          </span>
        );
      })}
    </span>
  );
}
