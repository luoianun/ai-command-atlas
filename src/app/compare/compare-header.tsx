"use client";
import { useT } from "@/components/language-provider";

export function CompareHeader() {
  const t = useT();
  return (
    <div className="py-8 pb-6 border-b border-[var(--border)]">
      <h1 className="text-[22px] font-bold tracking-[-0.02em] mb-[6px]">
        {t.compare.title}
      </h1>
      <p className="text-[13px] text-[var(--muted)]">
        {t.compare.subtitle}
      </p>
    </div>
  );
}
