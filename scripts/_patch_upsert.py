#!/usr/bin/env python3
"""Add ON DUPLICATE KEY UPDATE to scraped-data.sql INSERT statements.

Reads the file, finds each INSERT, and appends ON DUPLICATE KEY UPDATE
before the trailing semicolon.
"""
from pathlib import Path

MAPPINGS = {
    "commands": [
        "description", "description_zh", "examples", "notes", "notes_zh",
        "caveats", "caveats_zh", "source_url", "source_note", "parameters",
    ],
    "compare_capabilities": ["capability_zh", "capability_desc_zh"],
    "compare_entries": ["command_desc_zh", "none_label_zh"],
}


def process(content: str) -> str:
    lines = content.split("\n")
    out: list[str] = []
    for line in lines:
        stripped = line.strip()
        # Detect INSERT INTO `table` ... ;
        for table, cols in MAPPINGS.items():
            if stripped.startswith(f"INSERT INTO `{table}`") and stripped.endswith(";"):
                on_dup = ", ".join(f"`{c}`=VALUES(`{c}`)" for c in cols)
                new_line = stripped[:-1] + f" ON DUPLICATE KEY UPDATE {on_dup};"
                out.append(new_line)
                break
        else:
            out.append(line)
    return "\n".join(out)


def main():
    path = Path("scripts/scraped-data.sql")
    content = path.read_text(encoding="utf-8")
    result = process(content)
    path.write_text(result, encoding="utf-8")
    count = result.count("ON DUPLICATE KEY UPDATE")
    print(f"Added ON DUPLICATE KEY UPDATE to {count} INSERT(s) in {path}")


if __name__ == "__main__":
    main()
