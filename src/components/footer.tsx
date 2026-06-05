// src/components/footer.tsx
"use client";
import { useT } from "./language-provider";

export function Footer() {
  const t = useT();
  return (
    <footer className="border-t border-[var(--border)] px-6 py-5 flex items-center justify-between mt-2">
      <span className="text-[12px] text-[var(--muted)]">{t.footer.tagline}</span>
      <div className="flex gap-4">
        <a href="https://github.com/luoianun/ai-command-atlas" target="_blank" rel="noopener"
          className="text-[12px] text-[var(--muted)] no-underline hover:text-[var(--fg)]">{t.footer.github}</a>
        <a href="https://github.com/luoianun/ai-command-atlas/issues" target="_blank" rel="noopener"
          className="text-[12px] text-[var(--muted)] no-underline hover:text-[var(--fg)]">{t.footer.contribute}</a>
      </div>
    </footer>
  );
}
