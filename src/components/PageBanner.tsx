/**
 * Full-width MTG-art banner used as the page header on top-level pages.
 * Art sits under a scrim so overlaid text keeps AA contrast.
 */
export default function PageBanner({
  image,
  kicker,
  title,
  children,
}: {
  image: string;
  kicker: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="fade-in-up relative min-h-[200px] overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-black/40">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center opacity-80"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-base via-base/70 to-base/10"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-base/90 via-transparent to-base/30"
      />
      <div className="relative flex min-h-[200px] flex-col justify-end gap-2 p-6 sm:p-8">
        <p className="kicker">{kicker}</p>
        <h1 className="text-glow font-display text-3xl font-black uppercase tracking-wide text-slate-50 sm:text-4xl">
          {title}
        </h1>
        {children}
      </div>
    </header>
  );
}
