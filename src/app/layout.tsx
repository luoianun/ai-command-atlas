import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ai-command-atlas — AI CLI Command Reference",
  description:
    "Search AI CLI commands, slash commands, options, and examples for Claude Code, Codex CLI, Gemini CLI, Aider, and OpenCode.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
