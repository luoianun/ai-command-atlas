// src/components/copy-button.tsx
"use client";
import { useState } from "react";

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy}
      className={`inline-flex items-center gap-1 font-mono text-[10px] font-medium cursor-pointer border rounded-[4px] px-2 py-[3px] transition-colors ${copied ? "text-[var(--risk-low)] border-[var(--risk-low-bg)]" : "text-[#a1a1aa] border-[rgba(255,255,255,.1)] hover:text-[#e4e4e7] hover:border-[rgba(255,255,255,.2)]"} ${className ?? ""}`}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}
