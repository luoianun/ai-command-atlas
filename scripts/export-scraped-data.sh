#!/usr/bin/env bash
# Export scraped/enriched command data from MySQL to scripts/scraped-data.sql
# Uses INSERT ... ON DUPLICATE KEY UPDATE so it merges cleanly after seed.sql
# inserts the base rows.
#
# Usage: scripts/export-scraped-data.sh
# Prerequisites: mysql CLI in PATH
# Reads DB connection from .env.local

set -euo pipefail

cd "$(dirname "$0")/.."

# Load env from .env.local
if [ -f .env.local ]; then
  export $(grep -v '^\s*#' .env.local | grep '=' | xargs 2>/dev/null) || true
fi

OUTPUT="scripts/scraped-data.sql"

cat > "$OUTPUT" <<'HEADER'
-- ============================================================================
-- Scraped Data Export
-- ============================================================================
-- Auto-generated. Do NOT manually edit.
-- Run: scripts/export-scraped-data.sh
-- Mounted into docker initdb.d as 03-scraped-data.sql
-- ============================================================================

SET NAMES utf8mb4;
USE ai_command_atlas;

HEADER

# Dump table, join multi-line INSERT into one line, add ON DUPLICATE KEY UPDATE
# Args: table_name update_clause
dump_upsert() {
  local table="$1"
  local update_clause="$2"
  local tmpfile
  tmpfile=$(mktemp)

  docker exec atlas-mysql mysqldump --no-create-info --compact --skip-triggers \
    --complete-insert --skip-add-locks --skip-disable-keys \
    -uatlas -patlas_pass ai_command_atlas "$table" 2>/dev/null > "$tmpfile" || true

  if [ -s "$tmpfile" ]; then
    # Join lines, replace trailing ); with ON DUPLICATE KEY UPDATE ...;
    tr '\n' ' ' < "$tmpfile" | sed -E 's/  +/ /g' | sed "s/;$/ ON DUPLICATE KEY UPDATE ${update_clause};/" >> "$OUTPUT"
  fi
  rm -f "$tmpfile"
}

# Commands: update all enrichment columns
echo "-- commands: enrichment fields" >> "$OUTPUT"
dump_upsert "commands" "\`description\`=VALUES(\`description\`),\`description_zh\`=VALUES(\`description_zh\`),\`examples\`=VALUES(\`examples\`),\`notes\`=VALUES(\`notes\`),\`notes_zh\`=VALUES(\`notes_zh\`),\`caveats\`=VALUES(\`caveats\`),\`caveats_zh\`=VALUES(\`caveats_zh\`),\`source_url\`=VALUES(\`source_url\`),\`source_note\`=VALUES(\`source_note\`),\`parameters\`=VALUES(\`parameters\`)"

echo "" >> "$OUTPUT"
echo "-- compare_capabilities: zh fields" >> "$OUTPUT"
dump_upsert "compare_capabilities" "\`capability_zh\`=VALUES(\`capability_zh\`),\`capability_desc_zh\`=VALUES(\`capability_desc_zh\`)"

echo "" >> "$OUTPUT"
echo "-- compare_entries: zh fields" >> "$OUTPUT"
dump_upsert "compare_entries" "\`command_desc_zh\`=VALUES(\`command_desc_zh\`),\`none_label_zh\`=VALUES(\`none_label_zh\`)"

echo "" >> "$OUTPUT"
echo "-- End of scraped data export" >> "$OUTPUT"

echo "Exported to $OUTPUT"
wc -l "$OUTPUT"
