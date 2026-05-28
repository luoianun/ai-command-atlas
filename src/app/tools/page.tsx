// src/app/tools/page.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import type { Tool } from "@/types";

const PROVIDERS = ["", "Anthropic", "OpenAI", "Google", "Independent"];

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("");

  useEffect(() => {
    fetch("/api/tools").then(r => r.json()).then(setTools);
  }, []);

  const visible = tools.filter(t => {
    const q = query.toLowerCase();
    const matchQ = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    const matchP = !provider || t.company === provider;
    return matchQ && matchP;
  });

  return (
    <div className="max-w-[1120px] mx-auto px-6">
      {/* Page header */}
      <div className="pt-7 pb-5 border-b border-[var(--border)]">
        <nav className="flex items-center gap-[6px] text-[12px] text-[var(--muted)] mb-[10px]">
          <Link href="/" className="text-[var(--muted)] no-underline hover:text-[var(--fg)]">Home</Link>
          <span className="opacity-40">/</span>
          <span>Tools</span>
        </nav>
        <h1 className="text-[20px] font-bold tracking-[-0.02em] mb-1">AI CLI Tools</h1>
        <p className="text-[13px] text-[var(--muted)]">{tools.length} tools indexed · browse commands, options, and slash commands for each CLI</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-[10px] py-[18px] pb-4 flex-wrap">
        <div className="relative flex-1 max-w-[360px] min-w-[200px]">
          <svg className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" width="13" height="13" viewBox="0 0 15 15" fill="none">
            <path d="M10 6.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0zm-.657 3.757 2.7 2.7-.707.707-2.7-2.7a4.5 4.5 0 11.707-.707z" fill="currentColor" fillRule="evenodd"/>
          </svg>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tools…"
            className="w-full h-9 pl-[34px] pr-3 border border-[var(--border)] rounded-[var(--r)] font-mono text-[12px] text-[var(--fg)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,.07)] transition-all placeholder:font-sans placeholder:text-[var(--muted)]" />
        </div>
        <div className="flex items-center gap-[6px] flex-wrap">
          <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.06em] whitespace-nowrap">Provider</span>
          <div className="flex gap-1 flex-wrap">
            {PROVIDERS.map(p => (
              <button key={p} onClick={() => setProvider(p)}
                className={`px-[10px] py-1 border rounded-full text-[12px] font-medium cursor-pointer transition-all whitespace-nowrap
                  ${provider === p
                    ? "bg-[var(--fg)] border-[var(--fg)] text-white"
                    : "border-[var(--border)] text-[var(--muted)] bg-[var(--bg)] hover:border-[#a1a1aa] hover:text-[var(--fg)]"}`}>
                {p || "All"}
              </button>
            ))}
          </div>
        </div>
        <span className="ml-auto text-[12px] text-[var(--muted)] whitespace-nowrap">{visible.length} tool{visible.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Tool grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3 pb-12 max-[700px]:grid-cols-1">
        {visible.map(t => (
          <Link key={t.id} href={`/tools/${t.slug}`}
            className="flex flex-col border border-[var(--border)] rounded-[8px] p-[18px_20px] no-underline text-[var(--fg)] hover:border-[#a1a1aa] hover:shadow-[0_2px_10px_rgba(0,0,0,.06)] transition-all cursor-pointer">
            <div className="flex items-start gap-[14px] mb-3">
              <div className="w-10 h-10 rounded-[8px] flex-shrink-0 border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center font-mono text-[11px] font-bold"
                style={{ color: t.color }}>{t.avatar}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold tracking-[-0.01em] mb-[2px]">{t.name}</div>
                <div className="text-[11px] text-[var(--muted)]">by {t.company}</div>
              </div>
            </div>
            <p className="text-[12px] text-[var(--muted)] leading-[1.55] mb-[14px] flex-1 line-clamp-3">{t.description}</p>
            <div className="flex items-center gap-[6px] flex-wrap pt-3 border-t border-[var(--border-light)]">
              <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: t.color }} />
              <span className="inline-flex items-center px-[7px] py-[2px] rounded-[4px] text-[11px] font-medium bg-[var(--surface)] text-[var(--fg)] border border-[var(--border)] font-mono">
                {t.command_count} commands
              </span>
              <span className="inline-flex items-center px-[7px] py-[2px] rounded-[4px] text-[11px] font-medium bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]">
                {t.version}
              </span>
            </div>
          </Link>
        ))}
        {visible.length === 0 && tools.length > 0 && (
          <div className="col-span-full py-12 text-center text-[var(--muted)] border border-[var(--border)] rounded-[var(--r)]">
            <strong className="text-[var(--fg)] block text-[14px] mb-[6px]">No tools match your filter</strong>
            Try clearing the search or selecting a different provider.
          </div>
        )}
      </div>
    </div>
  );
}
