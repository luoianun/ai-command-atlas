// src/app/compare/compare-client.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import type { Tool, CompareCapability, CompareEntry } from "@/types";
import { RiskBadge, SourceBadge } from "@/components/badge";

const TABS = [
  { key: "model", label: "Model Selection" },
  { key: "session", label: "Session Management" },
  { key: "permission", label: "Permission / Sandbox" },
  { key: "mcp", label: "MCP" },
  { key: "config", label: "Config" },
] as const;

type CategoryKey = (typeof TABS)[number]["key"];

interface CategoryData {
  capabilities: CompareCapability[];
  entries: CompareEntry[];
  tools: Tool[];
}

function InlineCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      className={`inline-flex items-center gap-[3px] font-mono text-[10px] font-medium cursor-pointer bg-[var(--surface)] border rounded-[3px] px-[6px] py-[1px] transition-colors mt-[3px] ${
        copied
          ? "text-[var(--risk-low)] border-[var(--risk-low-bg)]"
          : "text-[var(--muted)] border-[var(--border)] hover:text-[var(--fg)] hover:border-[#a1a1aa]"
      }`}
    >
      {copied ? "✓ Copied" : "Copy"}
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

  // Group entries by capability_id then by tool_id for fast lookup
  const entryMap = new Map<string, CompareEntry>();
  entries.forEach((e) => {
    entryMap.set(`${e.capability_id}-${e.tool_id}`, e);
  });

  return (
    <>
      {/* Category tabs */}
      <div className="flex gap-[2px] border-b border-[var(--border)] pt-5 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-[7px] text-[13px] font-medium cursor-pointer border-b-2 mb-[-1px] transition-colors bg-transparent border-x-0 border-t-0 whitespace-nowrap
              ${
                activeTab === tab.key
                  ? "text-[var(--fg)] border-b-[var(--fg)]"
                  : "text-[var(--muted)] border-b-transparent hover:text-[var(--fg)]"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 py-4 flex-wrap text-[12px] text-[var(--muted)]">
        <span className="font-medium text-[var(--fg)]">Risk:</span>
        <span className="flex items-center gap-[5px]">
          <span className="inline-flex items-center px-[6px] py-[1px] rounded-[3px] text-[10px] font-medium bg-[var(--risk-low-bg)] text-[var(--risk-low)]">
            Low
          </span>
          Safe, reversible
        </span>
        <span className="flex items-center gap-[5px]">
          <span className="inline-flex items-center px-[6px] py-[1px] rounded-[3px] text-[10px] font-medium bg-[var(--risk-med-bg)] text-[var(--risk-med)]">
            Medium
          </span>
          Review before use
        </span>
        <span className="flex items-center gap-[5px]">
          <span className="inline-flex items-center px-[6px] py-[1px] rounded-[3px] text-[10px] font-medium bg-[var(--risk-high-bg)] text-[var(--risk-high)]">
            High
          </span>
          Potentially destructive
        </span>
        <span className="ml-auto text-[11px] text-[var(--muted)] hidden md:block">
          Click a command to view full details
        </span>
      </div>

      {/* Compare table */}
      <div className="overflow-x-auto pb-8">
        <table className="w-full border-collapse border border-[var(--border)] rounded-[var(--r)] overflow-hidden min-w-[860px]">
          <thead>
            <tr>
              <th className="text-left px-[14px] py-[10px] bg-[var(--surface)] border-b border-[var(--border)] text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] w-[180px]">
                Capability
              </th>
              {tools.map((t) => (
                <th
                  key={t.id}
                  className="text-left px-[14px] py-[10px] bg-[var(--surface)] border-b border-[var(--border)] text-[12px] font-semibold text-[var(--fg)] w-[174px]"
                >
                  <div className="flex items-center gap-[6px]">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: t.color }}
                    />
                    {t.name}
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
                  capIdx < capabilities.length - 1 ? "border-b border-[var(--border-light)]" : ""
                }
              >
                {/* Capability label */}
                <td className="p-[14px] bg-[var(--surface)] border-r border-[var(--border)] align-top">
                  <div className="text-[12px] font-semibold text-[var(--fg)]">
                    {cap.capability}
                  </div>
                  <div className="text-[11px] text-[var(--muted)] mt-[2px] leading-[1.4]">
                    {cap.capability_desc}
                  </div>
                </td>

                {/* Tool cells */}
                {tools.map((t, tIdx) => {
                  const entry = entryMap.get(`${cap.id}-${t.id}`);
                  return (
                    <td
                      key={t.id}
                      className={`px-[14px] py-3 align-top min-h-[60px] ${
                        tIdx < tools.length - 1 ? "border-r border-[var(--border-light)]" : ""
                      }`}
                    >
                      {!entry || !entry.has_feature ? (
                        <div className="text-[11px] text-[var(--muted)] flex items-center gap-1 pt-1">
                          <svg width="11" height="11" viewBox="0 0 15 15" fill="none">
                            <path
                              d="M7.5 1.5v12M1.5 7.5h12"
                              stroke="currentColor"
                              strokeLinecap="round"
                              opacity=".3"
                            />
                          </svg>
                          {entry?.none_label || "Not available"}
                        </div>
                      ) : (
                        <>
                          {entry.command_slug ? (
                            <Link
                              href={`/commands/${t.slug}/${entry.command_slug}`}
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
                              {entry.command_desc}
                            </div>
                          )}
                          <div className="flex gap-1 flex-wrap mt-1">
                            {entry.risk_level && <RiskBadge level={entry.risk_level} />}
                            {entry.source && <SourceBadge source={entry.source} />}
                          </div>
                          {entry.copy_text && <InlineCopyButton text={entry.copy_text} />}
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
    </>
  );
}
