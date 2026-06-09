"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SearchResult } from "@/types";
import { useT, useLang } from "./language-provider";

interface Suggestion {
  slug: string;
  name: string;
  tool_slug: string;
  tool_name: string;
}

type Mode = "suggest" | "search";

export function SearchBar({ activeTool }: { activeTool?: string }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [mode, setMode] = useState<Mode>("suggest");
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();

  const toolParam = activeTool && activeTool !== "all" ? `&tool=${activeTool}` : "";

  // Suggest (fast, prefix-based) — fires on every keystroke
  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) { setSuggestions([]); setOpen(false); return; }
    const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}${toolParam}`);
    const data: Suggestion[] = await res.json();
    setSuggestions(data);
    setMode("suggest");
    setFocusIdx(-1);
    setOpen(true);
  }, [toolParam]);

  // Full search — fires on Enter or clicking "搜索全部"
  const fetchSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}${toolParam}`);
    const data: SearchResult[] = await res.json();
    setResults(data.slice(0, 8));
    setMode("search");
    setFocusIdx(-1);
    setOpen(true);
  }, [toolParam]);

  // Suggest on keystroke with debounce
  useEffect(() => {
    const timer = setTimeout(() => fetchSuggestions(query), 120);
    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  // ⌘K shortcut
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

  const navigateToCommand = (toolSlug: string, slug: string) => {
    router.push(`/commands/${toolSlug}/${slug}`);
    setOpen(false);
    setQuery("");
  };

  const items = mode === "suggest" ? suggestions : results;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx(i => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusIdx >= 0 && items[focusIdx]) {
        navigateToCommand(items[focusIdx].tool_slug, items[focusIdx].slug);
      } else {
        fetchSearch(query);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (mode === "search") setMode("suggest");
  };

  return (
    <div
      className="relative max-w-[560px] mx-auto mb-5"
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}
    >
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M10 6.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0zm-.657 3.757 2.7 2.7-.707.707-2.7-2.7a4.5 4.5 0 11.707-.707z" fill="currentColor" fillRule="evenodd"/>
      </svg>

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={onKeyDown}
        onFocus={() => query.trim() && setOpen(true)}
        placeholder={t.search.placeholder}
        autoComplete="off"
        spellCheck={false}
        className="w-full h-[46px] pl-10 pr-12 border border-[var(--border)] rounded-[var(--r)] font-mono text-[13px] text-[var(--fg)] bg-[var(--bg)] outline-none transition-[border-color,box-shadow] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,.08)]"
      />
      <kbd className="absolute right-[11px] top-1/2 -translate-y-1/2 font-mono text-[10px] text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[5px] py-[1px]">
        ⌘K
      </kbd>

      {open && items.length > 0 && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r)] shadow-[0_8px_24px_rgba(0,0,0,.08)] z-[100] overflow-hidden text-left">
          {/* Header row */}
          <div className="flex items-center justify-between px-[14px] pt-[8px] pb-[4px]">
            <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-[.06em]">
              {mode === "suggest" ? "联想" : "搜索结果"}
            </span>
            {mode === "suggest" && (
              <button
                onMouseDown={e => { e.preventDefault(); fetchSearch(query); }}
                className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer bg-transparent border-0"
              >
                搜索全部 →
              </button>
            )}
          </div>

          {mode === "suggest" ? (
            suggestions.map((s, i) => (
              <button
                key={`${s.tool_slug}-${s.slug}`}
                onMouseDown={() => navigateToCommand(s.tool_slug, s.slug)}
                className={`w-full flex items-center gap-[10px] px-[14px] py-[8px] cursor-pointer text-[var(--fg)] transition-colors text-left border-0 bg-transparent ${i === focusIdx ? "bg-[var(--surface)]" : "hover:bg-[var(--surface)]"}`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[var(--muted)] flex-shrink-0">
                  <path d="M10 6.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0zm-.657 3.757 2.7 2.7-.707.707-2.7-2.7a4.5 4.5 0 11.707-.707z" fill="currentColor" fillRule="evenodd" transform="scale(0.8) translate(1.5,1.5)"/>
                </svg>
                <span className="font-mono text-[13px] font-medium text-[var(--accent)] flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  <HighlightMatch text={s.name} query={query} />
                </span>
                <span className="text-[10px] font-medium text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[6px] py-[1px] whitespace-nowrap flex-shrink-0">
                  {s.tool_name}
                </span>
              </button>
            ))
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                onMouseDown={() => navigateToCommand(r.tool_slug, r.slug)}
                className={`w-full flex items-center gap-[10px] px-[14px] py-[9px] cursor-pointer text-[var(--fg)] transition-colors text-left border-0 bg-transparent ${i === focusIdx ? "bg-[var(--surface)]" : "hover:bg-[var(--surface)]"}`}
              >
                <span className="font-mono text-[12px] font-medium text-[var(--accent)] min-w-[130px] max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                  {r.name}
                </span>
                <span className="text-[12px] text-[var(--muted)] flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {lang === "zh" && r.description_zh ? r.description_zh : r.description}
                </span>
                <span className="text-[10px] font-medium text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[6px] py-[1px] whitespace-nowrap flex-shrink-0">
                  {r.tool_name}
                </span>
              </button>
            ))
          )}

          <div className="flex justify-between px-[14px] py-[7px] border-t border-[var(--border-light)] text-[11px] text-[var(--muted)]">
            <span>↑↓ 导航</span>
            <span>Enter 打开 · Esc 关闭</span>
          </div>
        </div>
      )}

      {open && query.trim() && items.length === 0 && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r)] shadow-[0_8px_24px_rgba(0,0,0,.08)] z-[100] p-6 text-center text-[var(--muted)] text-[13px]">
          {t.search.noResults} &ldquo;<strong>{query}</strong>&rdquo;
        </div>
      )}
    </div>
  );
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-[var(--fg)] bg-[var(--accent-bg)] rounded-[2px] px-[1px]">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}
