// src/app/tools/[tool]/command-table-client.tsx
"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Command, CommandType } from "@/types";
import { RiskBadge, SourceBadge, TypeBadge, CatBadge } from "@/components/badge";

type Tab = "all" | CommandType;
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "option", label: "Command Options" },
  { key: "slash", label: "Slash Commands" },
  { key: "config", label: "Config" },
];

const CATEGORIES = ["", "Model", "Permission", "Session", "Config", "MCP", "Output"];
const RISKS = ["", "Low", "Medium", "High"];

export function CommandTableClient({ commands, toolSlug }: { commands: Command[]; toolSlug: string }) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [risk, setRisk] = useState("");
  const router = useRouter();

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: commands.length };
    commands.forEach(c => {
      counts[c.command_type] = (counts[c.command_type] || 0) + 1;
    });
    return counts;
  }, [commands]);

  const filtered = useMemo(() => commands.filter(c => {
    const tabMatch = tab === "all" || c.command_type === tab;
    const catMatch = !cat || c.category.toLowerCase() === cat.toLowerCase();
    const riskMatch = !risk || c.risk_level === risk.toLowerCase();
    const qMatch = !query || c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.description.toLowerCase().includes(query.toLowerCase());
    return tabMatch && catMatch && riskMatch && qMatch;
  }), [commands, tab, cat, risk, query]);

  return (
    <>
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
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter commands…"
              className="h-[34px] pl-[32px] pr-[10px] w-[220px] border border-[var(--border)] rounded-[var(--r)] font-mono text-[12px] text-[var(--fg)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors placeholder:font-sans placeholder:text-[var(--muted)]" />
          </div>
          <select value={cat} onChange={e => setCat(e.target.value)}
            className="h-[34px] px-2 border border-[var(--border)] rounded-[var(--r)] text-[12px] text-[var(--fg)] bg-[var(--bg)] outline-none cursor-pointer">
            {CATEGORIES.map(c => <option key={c} value={c}>{c || "All categories"}</option>)}
          </select>
          <select value={risk} onChange={e => setRisk(e.target.value)}
            className="h-[34px] px-2 border border-[var(--border)] rounded-[var(--r)] text-[12px] text-[var(--fg)] bg-[var(--bg)] outline-none cursor-pointer">
            {RISKS.map(r => <option key={r} value={r}>{r || "All risks"}</option>)}
          </select>
        </div>
        <span className="text-[12px] text-[var(--muted)]">{filtered.length} command{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mb-12">
        <table className="w-full border-collapse border border-[var(--border)] rounded-[var(--r)] overflow-hidden text-[13px]">
          <thead>
            <tr>
              <th className="text-left px-[14px] py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[200px] whitespace-nowrap">Command</th>
              <th className="text-left px-[14px] py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[90px]">Type</th>
              <th className="text-left px-[14px] py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)]">Description</th>
              <th className="text-left px-[14px] py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[110px]">Category</th>
              <th className="text-left px-[14px] py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[76px]">Risk</th>
              <th className="text-left px-[14px] py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[96px]">Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((cmd, idx) => (
              <tr key={cmd.id} onClick={() => router.push(`/commands/${toolSlug}/${cmd.slug}`)}
                className="cursor-pointer hover:bg-[var(--surface)] transition-colors">
                <td className={`px-[14px] py-[10px] ${idx < filtered.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}>
                  <div className="font-mono text-[12px] font-semibold text-[var(--accent)]">{cmd.name}</div>
                  {cmd.value_hint && <div className="font-mono text-[11px] text-[var(--muted)] mt-[2px]">{cmd.value_hint}</div>}
                </td>
                <td className={`px-[14px] py-[10px] ${idx < filtered.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}><TypeBadge type={cmd.command_type} /></td>
                <td className={`px-[14px] py-[10px] text-[var(--fg)] ${idx < filtered.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}>{cmd.description}</td>
                <td className={`px-[14px] py-[10px] ${idx < filtered.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}><CatBadge label={cmd.category} /></td>
                <td className={`px-[14px] py-[10px] ${idx < filtered.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}><RiskBadge level={cmd.risk_level} /></td>
                <td className={`px-[14px] py-[10px] ${idx < filtered.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}><SourceBadge source={cmd.source} /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[var(--muted)]">
                  <strong className="text-[var(--fg)] block text-[14px] mb-[6px]">No commands found</strong>
                  Try clearing the filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
