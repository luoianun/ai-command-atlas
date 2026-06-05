// src/components/code-block.tsx
import { CopyButton } from "./copy-button";

interface CodeBlockProps {
  lang?: string;
  code: string;
  copyText?: string;
}

export function CodeBlock({ lang = "shell", code, copyText }: CodeBlockProps) {
  return (
    <div className="relative bg-[var(--code-bg)] rounded-[var(--r)] overflow-hidden mt-2">
      <div className="flex items-center justify-between px-[14px] pt-2 pb-[6px] border-b border-[rgba(255,255,255,.06)]">
        <span className="font-mono text-[10px] font-semibold text-[#71717a] uppercase tracking-[.06em]">{lang}</span>
        <CopyButton text={copyText ?? code} />
      </div>
      <pre className="px-4 py-[14px] overflow-x-auto font-mono text-[12.5px] leading-[1.65] text-[#e4e4e7] whitespace-pre">{code}</pre>
    </div>
  );
}
