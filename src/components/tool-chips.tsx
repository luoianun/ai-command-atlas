// src/components/tool-chips.tsx
"use client";
import { useState } from "react";

const TOOLS = [
  { key: "all", label: "All", dotColor: null },
  { key: "claude-code", label: "Claude Code", dotColor: "#d97706" },
  { key: "codex-cli", label: "Codex CLI", dotColor: "#16a34a" },
  { key: "gemini-cli", label: "Gemini CLI", dotColor: "#2563eb" },
  { key: "aider", label: "Aider", dotColor: "#7c3aed" },
  { key: "opencode", label: "OpenCode", dotColor: "#0891b2" },
];

export function ToolChips({ onChange }: { onChange?: (key: string) => void }) {
  const [active, setActive] = useState("all");
  const select = (key: string) => { setActive(key); onChange?.(key); };

  return (
    <div className="flex gap-[6px] justify-center flex-wrap">
      {TOOLS.map(t => (
        <button key={t.key} onClick={() => select(t.key)}
          className={`inline-flex items-center gap-[5px] px-3 py-1 border rounded-full text-[12px] font-medium cursor-pointer transition-all select-none
            ${active === t.key
              ? "bg-[var(--fg)] border-[var(--fg)] text-white"
              : "border-[var(--border)] text-[var(--muted)] bg-[var(--bg)] hover:border-[#a1a1aa] hover:text-[var(--fg)]"}`}>
          {t.dotColor && <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: t.dotColor }} />}
          {t.label}
        </button>
      ))}
    </div>
  );
}
