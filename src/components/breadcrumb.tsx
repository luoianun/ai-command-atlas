"use client";
import Link from "next/link";
import { useT } from "./language-provider";

export function Breadcrumb({ items }: { items: { href?: string; label?: string; i18nKey?: string }[] }) {
  const t = useT();

  const keyMap: Record<string, string> = {
    home: t.nav.home,
    tools: t.nav.tools,
    commands: t.nav.commands,
    compare: t.nav.compare,
  };

  return (
    <nav className="flex items-center gap-[6px] py-[14px] text-[12px] text-[var(--muted)]">
      {items.map((item, i) => (
        <span key={i} className="contents">
          {i > 0 && <span className="opacity-40">/</span>}
          {item.href ? (
            <Link href={item.href} className="text-[var(--muted)] no-underline hover:text-[var(--fg)]">
              {item.i18nKey ? keyMap[item.i18nKey] || item.label : item.label}
            </Link>
          ) : (
            <span>{item.i18nKey ? keyMap[item.i18nKey] || item.label : item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
