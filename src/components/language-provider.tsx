"use client";
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { dictionaries, type Lang, type Dictionary } from "@/lib/i18n";

const LangContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dictionary;
}>({
  lang: "en",
  setLang: () => {},
  t: dictionaries.en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("atlas-lang") as Lang | null;
    if (saved && saved in dictionaries) setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("atlas-lang", l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t: dictionaries[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() { return useContext(LangContext); }
export function useT() { return useContext(LangContext).t; }

export function useDesc(en: string, zh: string | null | undefined): string {
  const { lang } = useContext(LangContext);
  return lang === "zh" && zh ? zh : en;
}
