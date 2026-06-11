// src/app/compare/compare-client.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import type { Tool, CompareCapability, CompareEntry } from "@/types";
import { RiskBadge, SourceBadge } from "@/components/badge";
import { useT, useLang } from "@/components/language-provider";

type CategoryKey = "model" | "session" | "permission" | "mcp" | "config";

interface CategoryData {
  capabilities: CompareCapability[];
  entries: CompareEntry[];
}

function InlineCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const t = useT();
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      aria-label={t.compare.copy}
      className={`inline-flex items-center gap-[3px] font-mono text-[10px] font-medium cursor-pointer border rounded-[4px] px-[6px] py-[2px] transition-colors mt-[3px] ${
        copied
          ? "bg-[var(--risk-low-bg)] text-[var(--risk-low)] border-[var(--risk-low-bg)]"
          : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--fg)] hover:border-[var(--fg)]"
      }`}
    >
      {copied ? t.compare.copied : t.compare.copy}
    </button>
  );
}

export function CompareClient({
  allData,
  tools,
}: {
  allData: Record<CategoryKey, CategoryData>;
  tools: Tool[];
}) {
  const [activeTab, setActiveTab] = useState<CategoryKey>("model");
  const { capabilities, entries } = allData[activeTab];
  const t = useT();
  const { lang } = useLang();

  const TABS: { key: CategoryKey; label: string }[] = [
    { key: "model", label: t.compare.tabs.model },
    { key: "session", label: t.compare.tabs.session },
    { key: "permission", label: t.compare.tabs.permission },
    { key: "mcp", label: t.compare.tabs.mcp },
    { key: "config", label: t.compare.tabs.config },
  ];

  const entryMap = new Map<string, CompareEntry>();
  entries.forEach((e) => {
    entryMap.set(`${e.capability_id}-${e.tool_id}`, e);
  });

  return (
    <>
      {/* Tabs + Legend toolbar */}
      <div className="toolbar-card mt-4">
        {/* Category tabs */}
        <div className="flex gap-[2px] border-b border-[var(--border)] overflow-x-auto px-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-[8px] text-[13px] font-medium cursor-pointer border-b-2 mb-[-1px] transition-colors bg-transparent border-x-0 border-t-0 whitespace-nowrap focus-ring ${
                activeTab === tab.key
                  ? "text-[var(--fg)] border-b-[var(--accent)]"
                  : "text-[var(--muted)] border-b-transparent hover:text-[var(--fg)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Legend — compact row */}
        <div className="flex items-center gap-4 px-4 py-[10px] flex-wrap">
          <span className="section-label">{t.compare.riskLabel}</span>
          <span className="flex items-center gap-[5px]">
            <span className="inline-flex items-center px-[6px] py-[1px] rounded-[3px] text-[10px] font-medium bg-[var(--risk-low-bg)] text-[var(--risk-low)]">
              {t.compare.low}
            </span>
            <span className="text-[11px] text-[var(--muted)]">{t.compare.safeLow}</span>
          </span>
          <span className="flex items-center gap-[5px]">
            <span className="inline-flex items-center px-[6px] py-[1px] rounded-[3px] text-[10px] font-medium bg-[var(--risk-med-bg)] text-[var(--risk-med)]">
              {t.compare.medium}
            </span>
            <span className="text-[11px] text-[var(--muted)]">{t.compare.reviewMed}</span>
          </span>
          <span className="flex items-center gap-[5px]">
            <span className="inline-flex items-center px-[6px] py-[1px] rounded-[3px] text-[10px] font-medium bg-[var(--risk-high-bg)] text-[var(--risk-high)]">
              {t.compare.high}
            </span>
            <span className="text-[11px] text-[var(--muted)]">{t.compare.destructiveHigh}</span>
          </span>
        </div>
      </div>

      {/* Compare table */}
      <div className="panel-card mt-4 overflow-hidden">
        <div className="overflow-x-auto pb-8">
          <table className="w-full border-collapse min-w-[860px]">
            <thead>
              <tr>
                <th className="text-left px-[14px] py-[10px] bg-[var(--surface)] border-b border-r border-[var(--border)] text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] w-[180px]">
                  {t.compare.capability}
                </th>
                {tools.map((tl) => (
                  <th
                    key={tl.id}
                    className="text-left px-[14px] py-[10px] bg-[var(--surface)] border-b border-[var(--border)] text-[12px] font-semibold text-[var(--fg)] w-[174px]"
                  >
                    <div className="flex items-center gap-[7px]">
                      <span
                        className="w-[9px] h-[9px] rounded-full flex-shrink-0 ring-1 ring-[var(--border)]"
                        style={{ background: tl.color }}
                      />
                      {tl.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {capabilities.map((cap, capIdx) => (
                <tr
                  key={cap.id}
                  className={
                    capIdx < capabilities.length - 1
                      ? "border-b border-[var(--border-light)]"
                      : ""
                  }
                >
                  {/* Capability column — stronger surface */}
                  <td className="p-[14px] bg-[var(--surface)] border-r border-[var(--border)] align-top">
                    <div className="text-[12px] font-semibold text-[var(--fg)]">
                      {lang === "zh" && cap.capability_zh
                        ? cap.capability_zh
                        : cap.capability}
                    </div>
                    <div className="text-[11px] text-[var(--muted)] mt-[2px] leading-[1.4]">
                      {lang === "zh" && cap.capability_desc_zh
                        ? cap.capability_desc_zh
                        : cap.capability_desc}
                    </div>
                  </td>

                  {tools.map((tl, tIdx) => {
                    const entry = entryMap.get(`${cap.id}-${tl.id}`);
                    const isSupported = entry && entry.has_feature;
                    return (
                      <td
                        key={tl.id}
                        className={`px-[14px] py-3 align-top ${
                          tIdx < tools.length - 1
                            ? "border-r border-[var(--border-light)]"
                            : ""
                        }`}
                      >
                        {!isSupported ? (
                          /* Unsupported cell */
                          <div className="flex items-center gap-[5px] pt-[3px]">
                            <span className="text-[14px] text-[var(--muted)] opacity-25 leading-none select-none">
                              —
                            </span>
                            <span className="text-[11px] text-[var(--muted)] opacity-50">
                              {entry?.none_label
                                ? lang === "zh" && entry.none_label_zh
                                  ? entry.none_label_zh
                                  : entry.none_label
                                : t.compare.notAvailable}
                            </span>
                          </div>
                        ) : (
                          /* Supported cell */
                          <>
                            {entry.command_slug ? (
                              <Link
                                href={`/commands/${tl.slug}/${entry.command_slug}`}
                                className="font-mono text-[12px] font-semibold text-[var(--accent)] no-underline hover:underline mb-[3px] block"
                              >
                                {entry.command_name}
                              </Link>
                            ) : (
                              <div className="font-mono text-[12px] font-semibold text-[var(--accent)] mb-[3px]">
                                {entry.command_name}
                              </div>
                            )}
                            {entry.command_desc && (
                              <div className="text-[11px] text-[var(--fg)] leading-[1.4] mb-[5px]">
                                {lang === "zh" && entry.command_desc_zh
                                  ? entry.command_desc_zh
                                  : entry.command_desc}
                              </div>
                            )}
                            <div className="flex gap-1 flex-wrap mt-1">
                              {entry.risk_level && (
                                <RiskBadge level={entry.risk_level} />
                              )}
                              {entry.source && (
                                <SourceBadge source={entry.source} />
                              )}
                            </div>
                            {entry.copy_text && (
                              <InlineCopyButton text={entry.copy_text} />
                            )}
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
