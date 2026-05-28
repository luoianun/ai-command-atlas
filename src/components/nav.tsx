// src/components/nav.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { useState, useEffect } from "react";

const navLinks = [
  { href: "/", label: "Home", zhLabel: "首页" },
  { href: "/tools", label: "Tools", zhLabel: "工具" },
  { href: "/compare", label: "Compare", zhLabel: "对比" },
];

export function Nav() {
  const path = usePathname();
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const saved = localStorage.getItem("atlas-lang") || "en";
    setLang(saved);
  }, []);

  const switchLang = (l: string) => {
    setLang(l);
    localStorage.setItem("atlas-lang", l);
  };

  return (
    <nav className="sticky top-0 z-50 h-12 px-6 border-b border-[var(--border)] bg-[rgba(255,255,255,0.95)] backdrop-blur-sm flex items-center justify-between">
      <div className="flex items-center gap-[6px]">
        <Link href="/" className="font-mono text-[13px] font-semibold text-[var(--fg)] no-underline tracking-[-0.02em] px-2 py-1 rounded-[var(--r)]">
          ai-command-<span className="text-[var(--accent)]">atlas</span>
        </Link>
        <div className="w-px h-5 bg-[var(--border)] mx-[6px]" />
        {navLinks.map(l => (
          <Link key={l.href} href={l.href}
            className={`text-[13px] no-underline px-[10px] py-1 rounded-[var(--r)] transition-colors max-[600px]:hidden ${path === l.href ? "text-[var(--fg)] font-medium" : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)]"}`}>
            {lang === "zh" ? l.zhLabel : l.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <select value={lang} onChange={e => switchLang(e.target.value)}
          className="h-7 pl-[9px] pr-6 border border-[var(--border)] rounded-[var(--r)] text-[12px] font-medium text-[var(--muted)] bg-[var(--bg)] cursor-pointer outline-none appearance-none hover:text-[var(--fg)] hover:border-[#a1a1aa] transition-colors"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2371717a'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 7px center', backgroundSize: '10px 6px' }}>
          <option value="en">English</option>
          <option value="zh">中文</option>
        </select>
        <ThemeToggle />
        <a href="https://github.com/luoianun/ai-command-atlas" target="_blank" rel="noopener"
          className="inline-flex items-center gap-[5px] text-[12px] font-medium text-[var(--muted)] no-underline px-[10px] py-1 border border-[var(--border)] rounded-[var(--r)] hover:text-[var(--fg)] hover:border-[#a1a1aa] transition-colors">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          GitHub
        </a>
      </div>
    </nav>
  );
}
