// src/components/footer.tsx
export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] px-6 py-5 flex items-center justify-between mt-2">
      <span className="text-[12px] text-[var(--muted)]">ai-command-atlas · community maintained · MIT</span>
      <div className="flex gap-4">
        <a href="https://github.com/luoianun/ai-command-atlas" target="_blank" rel="noopener"
          className="text-[12px] text-[var(--muted)] no-underline hover:text-[var(--fg)]">GitHub</a>
        <a href="https://github.com/luoianun/ai-command-atlas/issues" target="_blank" rel="noopener"
          className="text-[12px] text-[var(--muted)] no-underline hover:text-[var(--fg)]">Contribute</a>
      </div>
    </footer>
  );
}
