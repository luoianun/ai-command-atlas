// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { LanguageProvider } from "@/components/language-provider";

export const metadata: Metadata = {
  title: "ai-command-atlas — AI CLI Command Reference",
  description: "Search AI CLI commands, slash commands, options, and examples for Claude Code, Codex CLI, Gemini CLI, Aider, and OpenCode.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('atlas-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');})();` }} />
      </head>
      <body className="flex flex-col min-h-screen">
        <LanguageProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
