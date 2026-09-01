import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="fade-in-up mx-auto mt-20 max-w-md text-center">
      <p className="text-glow text-6xl font-black text-accent">404</p>
      <p className="mt-3 text-sm text-slate-400">
        That page slipped into the blind eternities.
      </p>
      <Link href="/" className="btn-primary mt-6 inline-flex">
        Back to the arena
      </Link>
    </div>
  );
}
