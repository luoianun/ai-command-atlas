// src/app/commands/[tool]/[command]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCommandBySlug, getSimilarCommands } from "@/lib/queries";
import { RiskBadge, SourceBadge, TypeBadge, CatBadge } from "@/components/badge";
import { CodeBlock } from "@/components/code-block";

export default async function CommandPage({
  params,
}: {
  params: Promise<{ tool: string; command: string }>;
}) {
  const { tool: toolSlug, command: commandSlug } = await params;
  const cmd = await getCommandBySlug(toolSlug, commandSlug);
  if (!cmd) notFound();

  const similar = await getSimilarCommands(cmd.name, cmd.tool_id);

  return (
    <div className="max-w-[1120px] mx-auto px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-[6px] py-[14px] text-[12px] text-[var(--muted)]">
        <Link href="/" className="text-[var(--muted)] no-underline hover:text-[var(--fg)]">Home</Link>
        <span className="opacity-40">/</span>
        <Link href="/tools" className="text-[var(--muted)] no-underline hover:text-[var(--fg)]">Tools</Link>
        <span className="opacity-40">/</span>
        <Link href={`/tools/${cmd.tool_slug}`} className="text-[var(--muted)] no-underline hover:text-[var(--fg)]">{cmd.tool_name}</Link>
        <span className="opacity-40">/</span>
        <span>{cmd.name}</span>
      </nav>

      <div className="grid grid-cols-[1fr_256px] gap-10 items-start pb-16 max-[860px]:grid-cols-1">
        {/* Main content */}
        <div>
          {/* Badges + title */}
          <div className="mb-4">
            <div className="flex gap-[6px] flex-wrap mb-2">
              <TypeBadge type={cmd.command_type} />
              <CatBadge label={cmd.category} />
              <RiskBadge level={cmd.risk_level} />
              <SourceBadge source={cmd.source} />
            </div>
            <h1 className="font-mono text-[28px] font-bold tracking-[-0.03em] text-[var(--fg)]">{cmd.name}</h1>
          </div>

          {/* Description */}
          <section className="mb-8">
            <div className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-[.08em] mb-[10px]">Description</div>
            <p className="text-[14px] text-[var(--fg)] leading-[1.7]">{cmd.description}</p>
          </section>

          {/* Syntax */}
          {cmd.syntax && (
            <section className="mb-8 border-t border-[var(--border-light)] pt-7">
              <div className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-[.08em] mb-[10px]">Syntax</div>
              <CodeBlock lang="shell" code={cmd.syntax} />
            </section>
          )}

          {/* Parameters */}
          {cmd.parameters && cmd.parameters.length > 0 && (
            <section className="mb-8 border-t border-[var(--border-light)] pt-7">
              <div className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-[.08em] mb-[10px]">Parameters</div>
              <table className="w-full border-collapse border border-[var(--border)] rounded-[var(--r)] overflow-hidden text-[13px]">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)]">Parameter</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)]">Type</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)]">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {cmd.parameters.map((p, i) => (
                    <tr key={i}>
                      <td className="px-3 py-[9px] border-b border-[var(--border-light)]">
                        <code className="font-mono text-[11px] text-[var(--accent)]">{p.name}</code>
                      </td>
                      <td className="px-3 py-[9px] border-b border-[var(--border-light)] text-[var(--muted)]">{p.type}</td>
                      <td className="px-3 py-[9px] border-b border-[var(--border-light)]">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Examples */}
          {cmd.examples && cmd.examples.length > 0 && (
            <section className="mb-8 border-t border-[var(--border-light)] pt-7">
              <div className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-[.08em] mb-[10px]">Examples</div>
              {cmd.examples.map((ex, i) => (
                <div key={i} className={i > 0 ? "mt-4" : ""}>
                  {ex.label && <p className="text-[12px] text-[var(--muted)] mb-2">{ex.label}:</p>}
                  <CodeBlock lang={ex.lang} code={ex.code} />
                </div>
              ))}
            </section>
          )}

          {/* Notes */}
          {cmd.notes && cmd.notes.length > 0 && (
            <section className="mb-8 border-t border-[var(--border-light)] pt-7">
              <div className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-[.08em] mb-[10px]">Notes</div>
              <ul className="flex flex-col gap-2">
                {cmd.notes.map((n, i) => (
                  <li key={i} className="flex gap-[10px] p-[10px_12px] border border-[var(--border-light)] rounded-[var(--r)] text-[13px] leading-[1.6]">
                    <svg className="flex-shrink-0 mt-[1px] text-[var(--accent)]" width="14" height="14" viewBox="0 0 15 15" fill="none">
                      <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor"/>
                      <path d="M7.5 4v4m0 2.5v.5" stroke="currentColor" strokeLinecap="round"/>
                    </svg>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Caveats */}
          {cmd.caveats && cmd.caveats.length > 0 && (
            <section className="mb-8 border-t border-[var(--border-light)] pt-7">
              <div className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-[.08em] mb-[10px]">Caveats</div>
              <ul className="flex flex-col gap-2">
                {cmd.caveats.map((c, i) => (
                  <li key={i} className="flex gap-[10px] p-[10px_12px] border border-[var(--risk-med-bg)] rounded-[var(--r)] bg-[#fffcf0] text-[13px] leading-[1.6]">
                    <svg className="flex-shrink-0 mt-[1px] text-[var(--risk-med)]" width="14" height="14" viewBox="0 0 15 15" fill="none">
                      <path d="M8.36 1.5a1 1 0 00-1.72 0l-6 10A1 1 0 001.5 13h12a1 1 0 00.86-1.5l-6-10z" stroke="currentColor" strokeLinejoin="round"/>
                      <path d="M7.5 6v3m0 2v.5" stroke="currentColor" strokeLinecap="round"/>
                    </svg>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="sticky top-[68px] max-[860px]:static">
          {/* Meta card */}
          <div className="border border-[var(--border)] rounded-[var(--r)] overflow-hidden mb-3">
            <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.07em] px-[14px] py-[10px] bg-[var(--surface)] border-b border-[var(--border)]">
              Command Info
            </div>
            {[
              { k: "Tool", v: <Link href={`/tools/${cmd.tool_slug}`} className="text-[var(--accent)] no-underline hover:underline">{cmd.tool_name}</Link> },
              { k: "Type", v: <span className="capitalize">{cmd.command_type}</span> },
              { k: "Category", v: cmd.category },
              { k: "Risk", v: <RiskBadge level={cmd.risk_level} /> },
              { k: "Source", v: <SourceBadge source={cmd.source} /> },
              { k: "Last checked", v: <span className="font-mono text-[11px]">{cmd.last_checked}</span> },
            ].map(row => (
              <div key={row.k} className="flex items-center justify-between px-[14px] py-[9px] border-b border-[var(--border-light)] text-[12px] last:border-b-0">
                <span className="text-[var(--muted)]">{row.k}</span>
                <span className="font-medium text-right">{row.v}</span>
              </div>
            ))}
          </div>

          {/* Source card */}
          {cmd.source_url && (
            <div className="border border-[var(--border)] rounded-[var(--r)] overflow-hidden mb-3">
              <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.07em] px-[14px] py-[10px] bg-[var(--surface)] border-b border-[var(--border)]">
                Official Source
              </div>
              <div className="p-[12px_14px]">
                <a href={cmd.source_url} target="_blank" rel="noopener"
                  className="text-[12px] text-[var(--accent)] no-underline flex items-center gap-[5px] hover:underline">
                  <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
                    <path d="M8 2.5a.5.5 0 000-1V2.5zm5 5a.5.5 0 000-1V7.5zm-5-5H3a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V7.5h-1V11H3V3.5h5v-1zm0 0h4.5M8 2.5l4.5 4.5M12.5 2.5V7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {cmd.source_url.replace(/^https?:\/\//, "")}
                </a>
                {cmd.source_note && (
                  <p className="text-[11px] text-[var(--muted)] mt-2 leading-[1.5]">{cmd.source_note}</p>
                )}
              </div>
            </div>
          )}

          {/* Similar commands */}
          {similar.length > 0 && (
            <div className="border border-[var(--border)] rounded-[var(--r)] overflow-hidden mb-3">
              <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.07em] px-[14px] py-[10px] bg-[var(--surface)] border-b border-[var(--border)]">
                Similar in Other CLIs
              </div>
              <div>
                {similar.map((s, i) => (
                  <div key={s.id} className={`flex items-center justify-between px-[14px] py-[9px] hover:bg-[var(--surface)] transition-colors ${i < similar.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}>
                    <Link href={`/commands/${s.tool_slug}/${s.slug}`} className="no-underline flex-1 min-w-0">
                      <div className="font-mono text-[11px] font-semibold text-[var(--accent)]">{s.name}</div>
                      <div className="text-[10px] text-[var(--muted)] mt-[1px]">{s.tool_name}</div>
                    </Link>
                    <div className="ml-2 flex-shrink-0">
                      <RiskBadge level={s.risk_level} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit on GitHub */}
          <div className="mt-3 p-3 border border-dashed border-[var(--border)] rounded-[var(--r)] text-[12px] text-[var(--muted)] text-center">
            See a mistake?{" "}
            <a href="https://github.com/luoianun/ai-command-atlas/issues" target="_blank" rel="noopener"
              className="text-[var(--accent)] no-underline hover:underline">
              Edit on GitHub ↗
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
