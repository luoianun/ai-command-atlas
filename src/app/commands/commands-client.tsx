"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Command, CommandType, Tool } from "@/types";
import { RiskBadge, SourceBadge, TypeBadge, CatBadge } from "@/components/badge";
import { useT, useLang } from "@/components/language-provider";

type Tab = "all" | CommandType;

const TAB_KEYS: Tab[] = ["all", "option", "slash", "subcommand", "flag", "config"];
const RISKS = ["", "low", "medium", "high"];

export function CommandsClient({
  initialCommands,
  tools,
  categories,
  initialFilters,
}: {
  initialCommands: Command[];
  tools: Tool[];
  categories: string[];
  initialFilters: { category: string; tool: string; risk: string; q: string };
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState(initialFilters.q);
  const [cat, setCat] = useState(initialFilters.category);
  const [risk, setRisk] = useState(initialFilters.risk);
  const [toolFilter, setToolFilter] = useState(initialFilters.tool);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const desc = (c: Command) => lang === "zh" && c.description_zh ? c.description_zh : c.description;

  const TABS = TAB_KEYS.map(k => ({ key: k, label: t.commands.tabs[k as keyof typeof t.commands.tabs] }));
  const RISK_LABELS: Record<string, string> = { "": t.commands.allRisks, low: t.badge.low, medium: t.badge.medium, high: t.badge.high };

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: initialCommands.length };
    initialCommands.forEach(c => {
      counts[c.command_type] = (counts[c.command_type] || 0) + 1;
    });
    return counts;
  }, [initialCommands]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const strip = (s: string) => s.replace(/^[-/]+/, "");

    const score = (c: Command): number => {
      if (!q) return 0;
      const name = c.name.toLowerCase();
      const stripped = strip(name);
      if (stripped === q || name === q) return 4;           // exact match
      if (stripped.startsWith(q)) return 3;                 // stripped prefix
      if (name.startsWith(q)) return 3;
      if (name.includes(q)) return 2;                       // name contains
      return 1;                                             // description contains
    };

    return initialCommands
      .filter(c => {
        const tabMatch = tab === "all" || c.command_type === tab;
        const catMatch = !cat || c.category === cat;
        const riskMatch = !risk || c.risk_level === risk;
        const toolMatch = !toolFilter || toolFilter === "all" || c.tool_slug === toolFilter;
        const qMatch = !query || c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          (c.description_zh ?? "").toLowerCase().includes(q);
        return tabMatch && catMatch && riskMatch && toolMatch && qMatch;
      })
      .sort((a, b) => {
        if (!q) return 0;
        const diff = score(b) - score(a);
        if (diff !== 0) return diff;
        return strip(a.name).localeCompare(strip(b.name));
      });
  }, [initialCommands, tab, cat, risk, toolFilter, query]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [tab, cat, risk, toolFilter, query]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      {/* Page header */}
      <div className="pt-7 pb-5 border-b border-[var(--border)]">
        <h1 className="font-mono text-[24px] font-bold tracking-[-0.03em] text-[var(--fg)] mb-1">{t.commands.title}</h1>
        <p className="text-[14px] text-[var(--muted)]">{t.commands.commandsAcross(initialCommands.length, tools.length)}</p>
      </div>
      {/* Tabs */}
      <div className="flex gap-[2px] border-b border-[var(--border)] pt-4 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-[6px] px-[14px] py-[7px] text-[13px] font-medium cursor-pointer border-b-2 mb-[-1px] transition-colors bg-transparent border-x-0 border-t-0 whitespace-nowrap
              ${tab === t.key
                ? "text-[var(--fg)] border-b-[var(--fg)]"
                : "text-[var(--muted)] border-b-transparent hover:text-[var(--fg)]"}`}>
            {t.label}
            <span className="font-mono text-[10px] font-semibold bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[5px] text-[var(--muted)]">
              {t.key === "all" ? tabCounts["all"] : (tabCounts[t.key] || 0)}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between py-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <svg className="absolute left-[9px] top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" width="13" height="13" viewBox="0 0 15 15" fill="none">
              <path d="M10 6.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0zm-.657 3.757 2.7 2.7-.707.707-2.7-2.7a4.5 4.5 0 11.707-.707z" fill="currentColor" fillRule="evenodd"/>
            </svg>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.commands.filterPlaceholder}
              className="h-[34px] pl-[32px] pr-[10px] w-[220px] border border-[var(--border)] rounded-[var(--r)] font-mono text-[12px] text-[var(--fg)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors placeholder:font-sans placeholder:text-[var(--muted)]" />
          </div>
          <select value={toolFilter} onChange={e => setToolFilter(e.target.value)}
            className="h-[34px] px-2 border border-[var(--border)] rounded-[var(--r)] text-[12px] text-[var(--fg)] bg-[var(--bg)] outline-none cursor-pointer">
            <option value="">{t.commands.allTools}</option>
            {tools.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
          <select value={cat} onChange={e => setCat(e.target.value)}
            className="h-[34px] px-2 border border-[var(--border)] rounded-[var(--r)] text-[12px] text-[var(--fg)] bg-[var(--bg)] outline-none cursor-pointer">
            <option value="">{t.commands.allCategories}</option>
            {categories.map(c => <option key={c} value={c}>{t.commands.categories[c as keyof typeof t.commands.categories] ?? c}</option>)}
          </select>
          <select value={risk} onChange={e => setRisk(e.target.value)}
            className="h-[34px] px-2 border border-[var(--border)] rounded-[var(--r)] text-[12px] text-[var(--fg)] bg-[var(--bg)] outline-none cursor-pointer">
            {RISKS.map(r => <option key={r} value={r}>{RISK_LABELS[r]}</option>)}
          </select>
        </div>
        <span className="text-[12px] text-[var(--muted)]">{t.commands.commandCount(filtered.length)}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-[var(--border)] rounded-[var(--r)] overflow-hidden text-[13px]">
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
              <tr key={cmd.id} onClick={() => router.push(`/commands/${cmd.tool_slug}/${cmd.slug}`)}
                className="cursor-pointer hover:bg-[var(--surface)] transition-colors">
                <td className={`px-[14px] py-[10px] ${idx < paginated.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}>
                  <div className="font-mono text-[12px] font-semibold text-[var(--accent)]">{cmd.name}</div>
                  <div className="text-[11px] text-[var(--muted)] mt-[1px]">{cmd.tool_name}</div>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4 mb-8">
          <span className="text-[12px] text-[var(--muted)]">
            第 {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} 条，共 {filtered.length} 条
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)} disabled={page === 1}
              className="h-7 px-2 text-[12px] border border-[var(--border)] rounded-[var(--r)] text-[var(--muted)] bg-[var(--bg)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              «
            </button>
            <button
              onClick={() => setPage(p => p - 1)} disabled={page === 1}
              className="h-7 px-2 text-[12px] border border-[var(--border)] rounded-[var(--r)] text-[var(--muted)] bg-[var(--bg)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              ‹
            </button>
            {/* Page number buttons — show at most 7 */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | "...")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="h-7 px-2 text-[12px] text-[var(--muted)] flex items-center">…</span>
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
              ›
            </button>
            <button
              onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="h-7 px-2 text-[12px] border border-[var(--border)] rounded-[var(--r)] text-[var(--muted)] bg-[var(--bg)] hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              »
            </button>
          </div>
        </div>
      )}
    </>
  );
}
