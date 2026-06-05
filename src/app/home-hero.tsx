"use client";
import { useState } from "react";
import { SearchBar } from "@/components/search-bar";
import { ToolChips } from "@/components/tool-chips";

export function HeroSection() {
  const [activeTool, setActiveTool] = useState("all");
  return (
    <>
      <SearchBar activeTool={activeTool} />
      <ToolChips onChange={setActiveTool} />
    </>
  );
}
