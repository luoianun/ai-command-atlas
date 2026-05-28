// src/components/badge.tsx
import type { RiskLevel, SourceType, CommandType } from "@/types";

const riskClass: Record<RiskLevel, string> = {
  low: "bg-[var(--risk-low-bg)] text-[var(--risk-low)]",
  medium: "bg-[var(--risk-med-bg)] text-[var(--risk-med)]",
  high: "bg-[var(--risk-high-bg)] text-[var(--risk-high)]",
};
const sourceClass: Record<SourceType, string> = {
  official: "bg-[#eff6ff] text-[#2563eb] dark:bg-[#172554] dark:text-[#93c5fd]",
  github: "bg-[#f5f3ff] text-[#7c3aed] dark:bg-[#2e1065] dark:text-[#c4b5fd]",
  community: "bg-[#f4f4f5] text-[#52525b] dark:bg-[#18181b] dark:text-[#a1a1aa]",
};
const typeClass: Record<CommandType, string> = {
  option: "bg-[#eff6ff] text-[#1d4ed8]",
  slash: "bg-[#f0fdf4] text-[#15803d]",
  subcommand: "bg-[#fdf4ff] text-[#7e22ce]",
  flag: "bg-[#f4f4f5] text-[#52525b]",
  config: "bg-[#f4f4f5] text-[#52525b]",
};

const riskLabel: Record<RiskLevel, string> = { low: "Low", medium: "Medium", high: "High" };
const sourceLabel: Record<SourceType, string> = { official: "Official", github: "GitHub", community: "Community" };
const typeLabel: Record<CommandType, string> = {
  option: "Option", slash: "Slash", subcommand: "Subcommand", flag: "Flag", config: "Config"
};

const badgeBase = "inline-flex items-center px-[7px] py-[2px] rounded-[4px] text-[11px] font-medium whitespace-nowrap";

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <span className={`${badgeBase} ${riskClass[level]}`}>{riskLabel[level]}</span>;
}
export function SourceBadge({ source }: { source: SourceType }) {
  return <span className={`${badgeBase} ${sourceClass[source]}`}>{sourceLabel[source]}</span>;
}
export function TypeBadge({ type }: { type: CommandType }) {
  return <span className={`${badgeBase} ${typeClass[type]}`}>{typeLabel[type]}</span>;
}
export function CatBadge({ label }: { label: string }) {
  return <span className={`${badgeBase} bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]`}>{label}</span>;
}
