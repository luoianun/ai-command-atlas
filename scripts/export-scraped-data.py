#!/usr/bin/env python3
"""Export scraped/enriched data as INSERT ... ON DUPLICATE KEY UPDATE."""

import subprocess, os, re
from pathlib import Path

HEADER = """\
-- ============================================================================
-- Scraped Data Export
-- ============================================================================
-- Auto-generated. Do NOT manually edit.
-- Run: scripts/export-scraped-data.sh (or python3 scripts/export-scraped-data.py)
-- Mounted into docker initdb.d as 03-scraped-data.sql
-- Uses ON DUPLICATE KEY UPDATE so it merges after seed.sql inserts base rows
-- ============================================================================

SET NAMES utf8mb4;
USE ai_command_atlas;

"""

def dump(table, update_cols):
    user = os.getenv("DB_USER", "atlas")
    pwd  = os.getenv("DB_PASS", "atlas_pass")
    db   = os.getenv("DB_NAME", "ai_command_atlas")
    result = subprocess.run(
        ["docker", "exec", "atlas-mysql", "mysqldump",
         "--no-create-info", "--compact", "--skip-triggers",
         "--complete-insert", "--skip-add-locks", "--skip-disable-keys",
         f"-u{user}", f"-p{pwd}", db, table],
        capture_output=True, text=True
    )
    raw = result.stdout.strip()
    if not raw:
        return ""
    # Join multi-line INSERT into single line
    sql = " ".join(raw.split())
    # Remove trailing ;
    sql = sql.rstrip(";")
    # Build ON DUPLICATE KEY UPDATE
    cols = ", ".join(f"`{c}`=VALUES(`{c}`)" for c in update_cols)
    return f"{sql} ON DUPLICATE KEY UPDATE {cols};"

def main():
    output = Path("scripts/scraped-data.sql")
    lines = [HEADER]

    lines.append("-- commands: enrichment fields")
    r = dump("commands", [
        "description","description_zh","examples","notes","notes_zh",
        "caveats","caveats_zh","source_url","source_note","parameters"
    ])
    if r:
        lines.append(r)

    lines.append("")
    lines.append("-- compare_capabilities: zh fields")
    r = dump("compare_capabilities", ["capability_zh", "capability_desc_zh"])
    if r:
        lines.append(r)

    lines.append("")
    lines.append("-- compare_entries: zh fields")
    r = dump("compare_entries", ["command_desc_zh", "none_label_zh"])
    if r:
        lines.append(r)

    lines.append("")
    lines.append("-- End of scraped data export")

    output.write_text("\n".join(lines), encoding="utf-8")
    n = len(output.read_text().splitlines())
    print(f"Exported to {output} ({n} lines)")

if __name__ == "__main__":
    main()
