"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useT } from "./language-provider";

interface Suggestion {
  slug: string;
  name: string;
  tool_slug: string;
  tool_name: string;
}

export function SearchBar({ activeTool }: { activeTool?: string }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const t = useT();

  const toolParam = activeTool && activeTool !== "all" ? `&tool=${activeTool}` : "";

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) { setSuggestions([]); setOpen(false); setFocusIdx(-1); return; }
    try {
      const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}${toolParam}`);
      const data: Suggestion[] = await res.json();
      setSuggestions(data);
      setFocusIdx(-1);
      setOpen(true);
    } catch {
      setSuggestions([]);
      setOpen(false);
      setFocusIdx(-1);
    }
  }, [toolParam]);

  useEffect(() => {
    const timer = setTimeout(() => fetchSuggestions(query), 120);
    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

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

  const goToCommandsPage = (q: string) => {
    const qs = new URLSearchParams({ q });
    if (activeTool && activeTool !== "all") qs.set("tool", activeTool);
    router.push(`/commands?${qs.toString()}`);
    setOpen(false);
    setQuery("");
  };

  const navigateToCommand = (toolSlug: string, slug: string) => {
    router.push(`/commands/${toolSlug}/${slug}`);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusIdx >= 0 && suggestions[focusIdx]) {
        navigateToCommand(suggestions[focusIdx].tool_slug, suggestions[focusIdx].slug);
      } else if (query.trim()) {
        goToCommandsPage(query.trim());
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const listboxId = "search-suggestions";
  const listboxOpen = open && suggestions.length > 0;

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
        role="combobox"
        aria-expanded={listboxOpen}
        aria-autocomplete="list"
        aria-controls={listboxOpen ? listboxId : undefined}
        aria-activedescendant={listboxOpen && focusIdx >= 0 ? `suggestion-${focusIdx}` : undefined}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => query.trim() && setOpen(true)}
        placeholder={t.search.placeholder}
        autoComplete="off"
        spellCheck={false}
        className="focus-ring w-full h-12 pl-10 pr-12 border border-[var(--border)] rounded-[14px] font-mono text-[13px] text-[var(--fg)] bg-[var(--bg)] outline-none transition-[border-color,box-shadow]"
      />
      <kbd className="absolute right-[11px] top-1/2 -translate-y-1/2 font-mono text-[10px] text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[5px] py-[1px]">
        Ctrl/⌘K
      </kbd>

      {listboxOpen && (
        <div id={listboxId} role="listbox" className="absolute top-[calc(100%+4px)] left-0 right-0 bg-[var(--bg)] border border-[var(--border)] rounded-[12px] shadow-[0_16px_40px_rgba(0,0,0,.14)] z-[100] overflow-hidden text-left">
          <div className="flex items-center justify-between px-[14px] pt-[10px] pb-[6px] bg-[var(--surface)]">
            <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-[.06em]">{t.search.suggestions}</span>
            <button
              onMouseDown={e => { e.preventDefault(); goToCommandsPage(query); }}
              className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer bg-transparent border-0"
            >
              {t.search.searchAll}
            </button>
          </div>

          {suggestions.map((s, i) => (
            <button
              key={`${s.tool_slug}-${s.slug}`}
              id={`suggestion-${i}`}
              role="option"
              aria-selected={i === focusIdx}
              onMouseDown={() => navigateToCommand(s.tool_slug, s.slug)}
              className={`w-full flex items-center gap-[10px] px-[14px] py-[9px] cursor-pointer text-[var(--fg)] transition-colors text-left border-0 bg-transparent ${i === focusIdx ? "bg-[var(--surface)]" : "hover:bg-[var(--surface)]"}`}
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
          ))}

          <div className="flex justify-between px-[14px] py-[8px] border-t border-[var(--border-light)] bg-[var(--surface)] text-[11px] text-[var(--muted)]">
            <span>{t.search.navigate}</span>
            <span>{t.search.open}</span>
          </div>
        </div>
      )}

      {open && query.trim() && suggestions.length === 0 && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-[var(--bg)] border border-[var(--border)] rounded-[12px] shadow-[0_16px_40px_rgba(0,0,0,.14)] z-[100] p-6 text-center text-[var(--muted)] text-[13px]">
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
