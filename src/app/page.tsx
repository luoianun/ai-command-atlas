// src/app/page.tsx
import Link from "next/link";
import { getRecentCommands, getStats, getCategoryStats, getTools } from "@/lib/queries";
import { SearchBar } from "@/components/search-bar";
import { ToolChips } from "@/components/tool-chips";
import { RiskBadge, SourceBadge, CatBadge } from "@/components/badge";

export default async function HomePage() {
  const [commands, stats, categories, tools] = await Promise.all([
    getRecentCommands(10),
    getStats(),
    getCategoryStats(),
    getTools(),
  ]);

  return (
    <div className="max-w-[1120px] mx-auto px-6">
      {/* Hero */}
      <div className="pt-[52px] pb-9 text-center border-b border-[var(--border-light)]">
        <div className="inline-flex items-center gap-[5px] font-mono text-[11px] font-medium text-[var(--muted)] tracking-[.06em] uppercase border border-[var(--border)] rounded-full px-[10px] py-[3px] mb-4">
          <span className="w-[5px] h-[5px] rounded-full bg-[var(--accent)] flex-shrink-0" />
          ai-command-atlas
        </div>
        <p className="text-[15px] text-[var(--muted)] mb-6 max-w-[480px] mx-auto">
          Search AI CLI commands, slash commands, options, and examples.
        </p>
        <SearchBar />
        <ToolChips />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center py-5 border-b border-[var(--border-light)] max-[600px]:flex-wrap max-[600px]:justify-start">
        {[
          { n: stats.cli_count, l: "CLIs" },
          { n: stats.command_count, l: "Commands" },
          { n: stats.slash_count, l: "Slash Commands" },
          { n: stats.official_count, l: "Official Sources" },
        ].map((s, i) => (
          <div key={i} className={`text-center px-7 max-[600px]:px-4 max-[600px]:py-3 ${i > 0 ? "border-l border-[var(--border)]" : ""}`}>
            <div className="font-mono text-[22px] font-semibold text-[var(--fg)] leading-[1.2]">{s.n}</div>
            <div className="text-[11px] text-[var(--muted)] mt-[2px]">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Browse by Category */}
      <div className="py-8 border-b border-[var(--border-light)]">
        <div className="flex items-center justify-between mb-[14px]">
          <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.07em]">Browse by Category</span>
        </div>
        <div className="flex gap-[6px] flex-wrap">
          {categories.map(c => (
            <Link key={c.category} href={`/tools?category=${encodeURIComponent(c.category)}`}
              className="inline-flex items-center gap-[6px] px-3 py-[5px] border border-[var(--border)] rounded-[var(--r)] text-[12px] font-medium text-[var(--fg)] bg-[var(--bg)] hover:bg-[var(--surface)] hover:border-[#a1a1aa] transition-colors no-underline">
              {c.category}
              <span className="font-mono text-[10px] text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[5px] leading-[17px]">{c.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="py-8 grid grid-cols-[1fr_300px] gap-8 max-[900px]:grid-cols-1">
        {/* Commands table */}
        <div>
          <div className="flex items-center justify-between mb-[14px]">
            <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.07em]">Recently Updated</span>
            <Link href="/tools" className="text-[12px] text-[var(--accent)] no-underline hover:text-[var(--accent-hover)] hover:underline">All commands →</Link>
          </div>
          <table className="w-full border-collapse border border-[var(--border)] rounded-[var(--r)] overflow-hidden text-[13px]">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[180px]">Command</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)]">Description</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[110px]">Category</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[72px]">Risk</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[90px]">Source</th>
              </tr>
            </thead>
            <tbody>
              {commands.map((cmd, idx) => (
                <tr key={cmd.id} className="cursor-pointer hover:bg-[var(--surface)] transition-colors">
                  <td className={`px-3 py-[9px] ${idx < commands.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}>
                    <Link href={`/commands/${cmd.tool_slug}/${cmd.slug}`} className="no-underline block">
                      <div className="font-mono text-[12px] font-medium text-[var(--accent)]">{cmd.name}</div>
                      <div className="text-[11px] text-[var(--muted)] mt-[1px]">{cmd.tool_name}</div>
                    </Link>
                  </td>
                  <td className={`px-3 py-[9px] max-w-[320px] text-[var(--fg)] ${idx < commands.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}>{cmd.description}</td>
                  <td className={`px-3 py-[9px] ${idx < commands.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}><CatBadge label={cmd.category} /></td>
                  <td className={`px-3 py-[9px] ${idx < commands.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}><RiskBadge level={cmd.risk_level} /></td>
                  <td className={`px-3 py-[9px] ${idx < commands.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}><SourceBadge source={cmd.source} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sidebar: Tools */}
        <div>
          <div className="flex items-center justify-between mb-[14px]">
            <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.07em]">AI CLI Tools</span>
            <Link href="/tools" className="text-[12px] text-[var(--accent)] no-underline hover:underline">All tools →</Link>
          </div>
          {tools.map(t => (
            <Link key={t.id} href={`/tools/${t.slug}`}
              className="flex items-center gap-3 p-3 border border-[var(--border)] rounded-[var(--r)] no-underline text-[var(--fg)] hover:border-[#a1a1aa] hover:shadow-[0_1px_6px_rgba(0,0,0,.05)] transition-all mb-[6px] group">
              <div className="w-8 h-8 rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0"
                style={{ color: t.color }}>{t.avatar}</div>
              <div>
                <div className="text-[13px] font-semibold">{t.name}</div>
                <div className="text-[11px] text-[var(--muted)] mt-[1px]">{t.command_count} commands · {t.company}</div>
              </div>
              <span className="ml-auto text-[var(--muted)] text-[12px]">›</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
