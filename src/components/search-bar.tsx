"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SearchResult } from "@/types";
import { useT, useLang } from "./language-provider";

export function SearchBar({ activeTool }: { activeTool?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();

  const search = useCallback(async (q: string, tool?: string) => {
    if (!q.trim()) { setOpen(false); return; }
    const params = new URLSearchParams({ q });
    if (tool && tool !== "all") params.set("tool", tool);
    const res = await fetch(`/api/search?${params}`);
    const data: SearchResult[] = await res.json();
    setResults(data.slice(0, 7));
    setFocusIdx(-1);
    setOpen(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query, activeTool), 150);
    return () => clearTimeout(t);
  }, [query, activeTool, search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const navigate = (r: SearchResult) => {
    router.push(`/commands/${r.tool_slug}/${r.slug}`);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && focusIdx >= 0) navigate(results[focusIdx]);
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
  };

  return (
    <div className="relative max-w-[560px] mx-auto mb-5"
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M10 6.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0zm-.657 3.757 2.7 2.7-.707.707-2.7-2.7a4.5 4.5 0 11.707-.707z" fill="currentColor" fillRule="evenodd"/>
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t.search.placeholder}
        autoComplete="off"
        spellCheck={false}
        className="w-full h-[46px] pl-10 pr-12 border border-[var(--border)] rounded-[var(--r)] font-mono text-[13px] text-[var(--fg)] bg-[var(--bg)] outline-none transition-[border-color,box-shadow] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,.08)]"
      />
      <kbd className="absolute right-[11px] top-1/2 -translate-y-1/2 font-mono text-[10px] text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[5px] py-[1px]">
        ⌘K
      </kbd>
      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r)] shadow-[0_8px_24px_rgba(0,0,0,.08)] z-[100] overflow-hidden text-left">
          {results.length === 0 ? (
            <div className="p-6 text-center text-[var(--muted)] text-[13px]">
              {t.search.noResults} &ldquo;<strong>{query}</strong>&rdquo;
            </div>
          ) : (
            <>
              {results.map((r, i) => (
                <button
                  key={r.id}
                  onMouseDown={() => navigate(r)}
                  className={`w-full flex items-center gap-[10px] px-[14px] py-[9px] cursor-pointer text-[var(--fg)] transition-colors text-left border-0 bg-transparent ${i === focusIdx ? "bg-[var(--surface)]" : "hover:bg-[var(--surface)]"}`}
                >
                  <span className="font-mono text-[12px] font-medium text-[var(--accent)] min-w-[160px]">{r.name}</span>
                  <span className="text-[12px] text-[var(--muted)] flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{lang === "zh" && r.description_zh ? r.description_zh : r.description}</span>
                  <span className="text-[10px] font-medium text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[6px] py-[1px] whitespace-nowrap">{r.tool_name}</span>
                </button>
              ))}
              <div className="flex justify-between px-[14px] py-[7px] border-t border-[var(--border-light)] text-[11px] text-[var(--muted)]">
                <span>{t.search.navigate}</span>
                <span>{t.search.open}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
