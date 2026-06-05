// src/app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-[1120px] mx-auto px-6 py-20 text-center">
      <div className="font-mono text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.07em] mb-3">404</div>
      <h1 className="text-[24px] font-bold tracking-[-0.02em] mb-3">Page not found</h1>
      <p className="text-[var(--muted)] text-[14px] mb-6">
        The page or command you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--accent)] no-underline hover:underline">
        ← Back to home
      </Link>
    </div>
  );
}
