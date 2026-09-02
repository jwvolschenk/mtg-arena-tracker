import { colorNames, splitColors } from '@/lib/colors';
import ManaSymbol from './ManaSymbol';

const HUES = [190, 210, 262, 330, 45, 160, 15];

function hueFor(name: string): number {
  let hash = 0;
  for (const char of name) hash += char.charCodeAt(0);
  return HUES[hash % HUES.length];
}

export default function Avatar({
  name,
  avatarPath,
  colors,
  size = 40,
  dimmed = false,
  sizeClassName,
}: {
  name: string;
  avatarPath: string | null;
  /** Deck-color flair, canonical letters e.g. "GB" — rendered as mana pips on the avatar's edge. */
  colors?: string | null;
  size?: number;
  dimmed?: boolean;
  /** Tailwind size classes; when given they replace the fixed inline size (e.g. "h-10 w-10 sm:h-14 sm:w-14"). */
  sizeClassName?: string;
}) {
  const style = sizeClassName ? undefined : { width: size, height: size };
  const ring = dimmed ? 'ring-2 ring-white/5' : 'ring-2 ring-accent/40';

  const manaColors = splitColors(colors);
  const pipSize = Math.min(18, Math.max(11, Math.round((sizeClassName ? 48 : size) * 0.34)));

  const avatar = avatarPath ? (
    // eslint-disable-next-line @next/next/no-img-element -- avatars are served by our own API route
    <img
      src={`/api/avatars/${avatarPath}`}
      alt={`${name}'s avatar`}
      style={style}
      className={`${sizeClassName ?? ''} rounded-full object-cover ${ring}`}
    />
  ) : (
    <div
      aria-hidden
      style={{
        ...style,
        ...(sizeClassName ? {} : { fontSize: Math.max(10, Math.round(size * 0.38)) }),
        background: `linear-gradient(135deg, hsl(${hueFor(name)} 70% 42%), hsl(${(hueFor(name) + 35) % 360} 60% 28%))`,
      }}
      className={`${sizeClassName ?? ''} flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white ${dimmed ? 'ring-2 ring-white/5 opacity-60' : 'ring-2 ring-white/10'}`}
    >
      {initialsFor(name)}
    </div>
  );

  if (manaColors.length === 0) return avatar;

  const names = colorNames(colors);
  return (
    <span className="relative inline-flex shrink-0">
      {avatar}
      <span
        title={`Deck colors: ${names}`}
        aria-label={`${name} plays ${names}`}
        className="absolute -bottom-1 left-1/2 z-10 flex -translate-x-1/2 gap-[1.5px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]"
      >
        {manaColors.map((letter) => (
          <ManaSymbol key={letter} color={letter} size={pipSize} />
        ))}
      </span>
    </span>
  );
}

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
