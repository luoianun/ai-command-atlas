"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Command, Tool, Stats } from "@/types";
import { RiskBadge, SourceBadge, CatBadge } from "@/components/badge";
import { ToolAvatar } from "@/components/tool-avatar";
import { HeroSection } from "./home-hero";
import { useT, useLang } from "@/components/language-provider";

export function HomeContent({
  commands,
  stats,
  categories,
  tools,
}: {
  commands: Command[];
  stats: Stats;
  categories: { category: string; count: number }[];
  tools: Tool[];
}) {
  const t = useT();
  const { lang } = useLang();
  const router = useRouter();
  const desc = (cmd: Command) => lang === "zh" && cmd.description_zh ? cmd.description_zh : cmd.description;

  return (
    <div className="app-shell-bg min-h-screen">
      <div className="max-w-[1120px] mx-auto px-6">

        {/* Hero */}
        <div className="pt-[52px] pb-9 text-center">
          <div className="panel-card inline-block px-8 py-8 mb-0 w-full max-w-[680px] mx-auto">
            <div className="inline-flex items-center gap-[9px] font-mono text-[15px] font-medium tracking-[.02em] border border-[var(--border)] rounded-[10px] px-[18px] py-[9px] mb-5 bg-[var(--bg)]">
              <svg width="16" height="16" viewBox="0 0 12 12" fill="none" className="flex-shrink-0" aria-hidden="true">
                <path d="M1.5 3.5l3.5 2.5-3.5 2.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 8.5h3.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="text-[var(--fg)]">ai-command</span>
              <span className="text-[var(--border)]">·</span>
              <span className="text-[var(--accent)] font-semibold">atlas</span>
            </div>
            <p className="text-[15px] text-[var(--muted)] mb-6 max-w-[480px] mx-auto">
              {t.home.tagline}
            </p>
            <HeroSection />
          </div>
        </div>

        {/* Stats grid */}
        <div className="py-4">
          <div className="grid grid-cols-4 gap-3 max-[600px]:grid-cols-2">
            {[
              { n: stats.cli_count, l: t.home.stats.clis },
              { n: stats.command_count, l: t.home.stats.commands },
              { n: stats.slash_count, l: t.home.stats.slash },
              { n: stats.official_count, l: t.home.stats.official },
            ].map((s, i) => (
              <div key={i} className="panel-card interactive-card flex items-center gap-3 px-4 py-3">
                <div className="font-mono text-[20px] font-semibold text-[var(--fg)] leading-none">{s.n}</div>
                <div className="text-[11px] text-[var(--muted)]">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Browse by Category */}
        <div className="py-6 border-t border-[var(--border-light)]">
          <div className="flex items-center justify-between mb-4">
            <span className="section-label">{t.home.browseByCategory}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map(c => (
              <Link key={c.category} href={`/commands?category=${encodeURIComponent(c.category)}`}
                className="panel-card interactive-card inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium text-[var(--fg)] no-underline">
                {c.category}
                <span className="font-mono text-[10px] text-[var(--accent)] bg-[var(--accent-bg)] rounded-full px-2 py-[1px] leading-[17px]">{c.count}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Main grid */}
        <div className="py-8 grid grid-cols-[1fr_300px] gap-8 max-[900px]:grid-cols-1">
          {/* Commands table */}
          <div>
            <div className="flex items-center justify-between mb-[14px]">
              <span className="section-label">{t.home.recentlyUpdated}</span>
              <Link href="/commands" className="text-[12px] text-[var(--accent)] no-underline hover:text-[var(--accent-hover)] hover:underline">{t.home.allCommands} →</Link>
            </div>
            <div className="panel-card overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[180px]">{t.commands.command}</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)]">{t.commands.description}</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[110px]">{t.commands.category}</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[72px]">{t.commands.risk}</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[90px]">{t.commands.source}</th>
                  </tr>
                </thead>
                <tbody>
                  {commands.map((cmd, idx) => {
                    const href = `/commands/${cmd.tool_slug}/${cmd.slug}`;
                    const borderB = idx < commands.length - 1 ? "border-b border-[var(--border-light)]" : "";
                    return (
                      <tr
                        key={cmd.id}
                        className="interactive-row cursor-pointer"
                        role="link"
                        tabIndex={0}
                        onClick={() => router.push(href)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(href); } }}
                      >
                        <td className={`px-3 py-[9px] ${borderB}`}>
                          <div className="font-mono text-[12px] font-medium text-[var(--accent)]">{cmd.name}</div>
                          <div className="text-[11px] text-[var(--muted)] mt-[1px]">{cmd.tool_name}</div>
                        </td>
                        <td className={`px-3 py-[9px] max-w-[320px] text-[var(--fg)] ${borderB}`}>{desc(cmd)}</td>
                        <td className={`px-3 py-[9px] ${borderB}`}><CatBadge label={cmd.category} /></td>
                        <td className={`px-3 py-[9px] ${borderB}`}><RiskBadge level={cmd.risk_level} /></td>
                        <td className={`px-3 py-[9px] ${borderB}`}><SourceBadge source={cmd.source} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </div>

          {/* Sidebar: Tools */}
          <div>
            <div className="flex items-center justify-between mb-[14px]">
              <span className="section-label">{t.home.aiCliTools}</span>
              <Link href="/tools" className="text-[12px] text-[var(--accent)] no-underline hover:underline">{t.home.allTools} →</Link>
            </div>
            <div className="flex flex-col gap-[6px]">
              {tools.map(tl => (
                <Link key={tl.id} href={`/tools/${tl.slug}`}
                  className="panel-card interactive-card flex items-center gap-3 p-3 no-underline text-[var(--fg)] group">
                  <ToolAvatar slug={tl.slug} avatar={tl.avatar} color={tl.color} size={32} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold">{tl.name}</div>
                    <div className="text-[11px] text-[var(--muted)] mt-[1px]">{tl.command_count} {t.tools.commands} · {tl.company}</div>
                  </div>
                  <span className="ml-auto text-[var(--muted)] text-[12px]">→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
