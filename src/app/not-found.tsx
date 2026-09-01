import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="fade-in-up relative mx-auto mt-12 max-w-md overflow-hidden rounded-2xl border border-white/10 text-center shadow-xl shadow-black/40">
      <div
        aria-hidden
        className="float absolute inset-0 bg-cover bg-center opacity-50"
        style={{ backgroundImage: 'url(/art/hero-emrakul.jpg)' }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-base/75 via-base/85 to-base"
      />
      <div className="relative px-6 py-14">
        <p className="text-glow font-display text-6xl font-black text-accent">404</p>
        <p className="mt-3 text-sm text-slate-400">
          That page slipped into the blind eternities.
        </p>
        <Link href="/" className="btn-primary mt-7 inline-flex">
          Back to the arena
        </Link>
      </div>
    </div>
  );
}
