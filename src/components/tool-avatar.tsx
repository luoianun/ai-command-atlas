"use client";
import Image from "next/image";

const LOGO_MAP: Record<string, { src: string; type: "svg" | "png" }> = {
  "claude-code": { src: "/logos/claude-code.svg",  type: "svg" },
  "codex-cli":   { src: "/logos/codex-cli.svg",    type: "svg" },
  "gemini-cli":  { src: "/logos/gemini-cli.svg",   type: "svg" },
  "aider":       { src: "/logos/aider.svg",         type: "svg" },
  "opencode":    { src: "/logos/opencode.png",      type: "png" },
  "goose":       { src: "/logos/goose.svg",         type: "svg" },
  "cline":       { src: "/logos/cline.svg",         type: "svg" },
  "kiro":        { src: "/logos/kiro.svg",          type: "svg" },
  "gh-copilot":  { src: "/logos/gh-copilot.svg",   type: "svg" },
  "qoder":       { src: "/logos/qoder.svg",         type: "svg" },
  "trae":        { src: "/logos/trae.svg",          type: "svg" },
  "kilo-code":   { src: "/logos/kilo-code.svg",     type: "svg" },
};

interface ToolAvatarProps {
  slug: string;
  avatar: string;
  color: string;
  size?: number;
  className?: string;
}

export function ToolAvatar({ slug, avatar, color, size = 40, className = "" }: ToolAvatarProps) {
  const logo = LOGO_MAP[slug];

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
  };

  if (logo) {
    return (
      <div
        className={`rounded-[8px] border border-[var(--border)] bg-white flex items-center justify-center flex-shrink-0 overflow-hidden ${className}`}
        style={containerStyle}
      >
        <Image
          src={logo.src}
          alt={avatar}
          width={size - 10}
          height={size - 10}
          style={{ objectFit: "contain" }}
        />
      </div>
    );
  }

  // Fallback to text avatar
  return (
    <div
      className={`rounded-[8px] border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center font-mono font-bold flex-shrink-0 ${className}`}
      style={{ ...containerStyle, color, fontSize: size * 0.275 }}
    >
      {avatar}
    </div>
  );
}
