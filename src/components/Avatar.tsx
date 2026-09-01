const HUES = [190, 210, 262, 330, 45, 160, 15];

function hueFor(name: string): number {
  let hash = 0;
  for (const char of name) hash += char.charCodeAt(0);
  return HUES[hash % HUES.length];
}

export default function Avatar({
  name,
  avatarPath,
  size = 40,
  dimmed = false,
}: {
  name: string;
  avatarPath: string | null;
  size?: number;
  dimmed?: boolean;
}) {
  const style = { width: size, height: size };
  const ring = dimmed ? 'ring-2 ring-white/5' : 'ring-2 ring-accent/40';

  if (avatarPath) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars are served by our own API route
      <img
        src={`/api/avatars/${avatarPath}`}
        alt={`${name}'s avatar`}
        style={style}
        className={`rounded-full object-cover ${ring}`}
      />
    );
  }

  const hue = hueFor(name);
  const initials = name
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      aria-hidden
      style={{
        ...style,
        fontSize: Math.max(10, Math.round(size * 0.38)),
        background: `linear-gradient(135deg, hsl(${hue} 70% 42%), hsl(${(hue + 35) % 360} 60% 28%))`,
      }}
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white ${dimmed ? 'ring-2 ring-white/5 opacity-60' : 'ring-2 ring-white/10'}`}
    >
      {initials}
    </div>
  );
}
