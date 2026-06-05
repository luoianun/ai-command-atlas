"use client";
import { useT } from "@/components/language-provider";

export function CompareHeader() {
  const t = useT();
  return (
    <div className="pt-7 pb-5 border-b border-[var(--border)]">
      <h1 className="font-mono text-[24px] font-bold tracking-[-0.03em] text-[var(--fg)] mb-1">
        {t.compare.title}
      </h1>
      <p className="text-[14px] text-[var(--muted)]">
        {t.compare.subtitle}
      </p>
    </div>
  );
}
