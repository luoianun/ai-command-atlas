// src/app/tools/[tool]/command-table-client.tsx
"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Command, CommandType } from "@/types";
import { RiskBadge, SourceBadge, TypeBadge, CatBadge } from "@/components/badge";
import { useT, useLang } from "@/components/language-provider";

type Tab = "all" | CommandType;

const CATEGORIES = ["", "Model", "Permission", "Session", "Config", "MCP", "Output"];
const RISKS = ["", "low", "medium", "high"];
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

export function CommandTableClient({ commands, toolSlug }: { commands: Command[]; toolSlug: string }) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [risk, setRisk] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const desc = (c: Command) => lang === "zh" && c.description_zh ? c.description_zh : c.description;

  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: t.commands.tabs.all },
    { key: "option", label: t.commands.tabs.option },
    { key: "slash", label: t.commands.tabs.slash },
    { key: "config", label: t.commands.tabs.config },
  ];

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: commands.length };
    commands.forEach(c => {
      counts[c.command_type] = (counts[c.command_type] || 0) + 1;
    });
    return counts;
  }, [commands]);

  const filtered = useMemo(() => commands.filter(c => {
    const q = query.toLowerCase();
    const tabMatch = tab === "all" || c.command_type === tab;
    const catMatch = !cat || c.category.toLowerCase() === cat.toLowerCase();
    const riskMatch = !risk || c.risk_level === risk;
    const qMatch = !query || c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (c.description_zh ?? "").toLowerCase().includes(q);
    return tabMatch && catMatch && riskMatch && qMatch;
  }), [commands, tab, cat, risk, query]);

  const updateTab = (nextTab: Tab) => { setTab(nextTab); setPage(1); };
  const updateQuery = (nextQuery: string) => { setQuery(nextQuery); setPage(1); };
  const updateCategory = (nextCategory: string) => { setCat(nextCategory); setPage(1); };
  const updateRisk = (nextRisk: string) => { setRisk(nextRisk); setPage(1); };
  const updatePageSize = (nextPageSize: number) => { setPageSize(nextPageSize as (typeof PAGE_SIZE_OPTIONS)[number]); setPage(1); };

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-[2px] border-b border-[var(--border)] pt-4 overflow-x-auto">
        {TABS.map(tb => (
          <button key={tb.key} onClick={() => updateTab(tb.key)}
            className={`flex items-center gap-[6px] px-[14px] py-[7px] text-[13px] font-medium cursor-pointer border-b-2 mb-[-1px] transition-colors bg-transparent border-x-0 border-t-0 whitespace-nowrap
              ${tab === tb.key
                ? "text-[var(--fg)] border-b-[var(--fg)]"
                : "text-[var(--muted)] border-b-transparent hover:text-[var(--fg)]"}`}>
            {tb.label}
            <span className="font-mono text-[10px] font-semibold bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[5px] text-[var(--muted)]">
              {tb.key === "all" ? tabCounts["all"] : (tabCounts[tb.key] || 0)}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar-card p-3 my-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <svg className="absolute left-[9px] top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" width="13" height="13" viewBox="0 0 15 15" fill="none">
                <path d="M10 6.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0zm-.657 3.757 2.7 2.7-.707.707-2.7-2.7a4.5 4.5 0 11.707-.707z" fill="currentColor" fillRule="evenodd"/>
              </svg>
              <input
                value={query}
                onChange={e => updateQuery(e.target.value)}
                placeholder={t.commands.filterPlaceholder}
                aria-label={t.commands.filterPlaceholder}
                className="focus-ring h-[34px] pl-[32px] pr-[10px] w-[220px] border border-[var(--border)] rounded-[var(--r)] font-mono text-[12px] text-[var(--fg)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors placeholder:font-sans placeholder:text-[var(--muted)]"
              />
            </div>
            <select value={cat} onChange={e => updateCategory(e.target.value)}
              className="focus-ring h-[34px] px-2 border border-[var(--border)] rounded-[var(--r)] text-[12px] text-[var(--fg)] bg-[var(--bg)] outline-none cursor-pointer">
              {CATEGORIES.map(c => <option key={c} value={c}>{c ? (t.commands.categories[c as keyof typeof t.commands.categories] ?? c) : t.commands.allCategories}</option>)}
            </select>
            <select value={risk} onChange={e => updateRisk(e.target.value)}
              className="focus-ring h-[34px] px-2 border border-[var(--border)] rounded-[var(--r)] text-[12px] text-[var(--fg)] bg-[var(--bg)] outline-none cursor-pointer">
              {RISKS.map(r => <option key={r} value={r}>{r ? t.badge[r as keyof typeof t.badge] : t.commands.allRisks}</option>)}
            </select>
          </div>
          <span className="text-[12px] text-[var(--muted)]">{t.commands.commandCount(filtered.length)}</span>
        </div>
      </div>

      {/* Table */}
      <div className="panel-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="text-left px-[14px] py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[200px] whitespace-nowrap">{t.commands.command}</th>
                <th className="text-left px-[14px] py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[90px]">{t.commands.type}</th>
                <th className="text-left px-[14px] py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)]">{t.commands.description}</th>
                <th className="text-left px-[14px] py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[110px]">{t.commands.category}</th>
                <th className="text-left px-[14px] py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[76px]">{t.commands.risk}</th>
                <th className="text-left px-[14px] py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[96px]">{t.commands.source}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((cmd, idx) => (
                <tr key={cmd.id} onClick={() => router.push(`/commands/${toolSlug}/${cmd.slug}`)}
                  className="interactive-row cursor-pointer">
                  <td className={`px-[14px] py-[10px] ${idx < paginated.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}>
                    <div className="font-mono text-[12px] font-semibold text-[var(--accent)]">{cmd.name}</div>
                    {cmd.value_hint && <div className="font-mono text-[11px] text-[var(--muted)] mt-[2px]">{cmd.value_hint}</div>}
                  </td>
                  <td className={`px-[14px] py-[10px] ${idx < paginated.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}><TypeBadge type={cmd.command_type} /></td>
                  <td className={`px-[14px] py-[10px] text-[var(--fg)] ${idx < paginated.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}>{desc(cmd)}</td>
                  <td className={`px-[14px] py-[10px] ${idx < paginated.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}><CatBadge label={t.commands.categories[cmd.category as keyof typeof t.commands.categories] ?? cmd.category} /></td>
                  <td className={`px-[14px] py-[10px] ${idx < paginated.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}><RiskBadge level={cmd.risk_level} /></td>
                  <td className={`px-[14px] py-[10px] ${idx < paginated.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}><SourceBadge source={cmd.source} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--muted)]">
                    <strong className="text-[var(--fg)] block text-[14px] mb-[6px]">{t.commands.noCommandsFound}</strong>
                    {t.commands.clearFilters}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap py-4 mb-8">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[12px] text-[var(--muted)]">
            {filtered.length > 0 ? t.commands.showingRange((page - 1) * pageSize + 1, Math.min(page * pageSize, filtered.length), filtered.length) : t.commands.showingRange(0, 0, 0)}
          </span>
          <label className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
            <span>{lang === "zh" ? "每页" : "Per page"}</span>
            <select
              value={pageSize}
              onChange={e => updatePageSize(Number(e.target.value))}
              className="focus-ring h-7 px-2 border border-[var(--border)] rounded-[var(--r)] text-[12px] text-[var(--fg)] bg-[var(--bg)] outline-none cursor-pointer">
              {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)} disabled={page === 1}
              className="h-7 px-2 text-[12px] border border-[var(--border)] rounded-[var(--r)] text-[var(--muted)] bg-[var(--bg)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              {"«"}
            </button>
            <button
              onClick={() => setPage(p => p - 1)} disabled={page === 1}
              className="h-7 px-2 text-[12px] border border-[var(--border)] rounded-[var(--r)] text-[var(--muted)] bg-[var(--bg)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              {"‹"}
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | "...")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="h-7 px-2 text-[12px] text-[var(--muted)] flex items-center">{"…"}</span>
                ) : (
                  <button key={p}
                    onClick={() => setPage(p as number)}
                    className={`h-7 min-w-[28px] px-2 text-[12px] border rounded-[var(--r)] transition-colors ${page === p ? "bg-[var(--fg)] border-[var(--fg)] text-[var(--bg)] font-semibold" : "border-[var(--border)] text-[var(--muted)] bg-[var(--bg)] hover:bg-[var(--surface)]"}`}>
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
              className="h-7 px-2 text-[12px] border border-[var(--border)] rounded-[var(--r)] text-[var(--muted)] bg-[var(--bg)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              {"›"}
            </button>
            <button
              onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="h-7 px-2 text-[12px] border border-[var(--border)] rounded-[var(--r)] text-[var(--muted)] bg-[var(--bg)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              {"»"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
