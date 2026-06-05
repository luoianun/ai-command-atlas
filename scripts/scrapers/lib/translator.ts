import Anthropic from "@anthropic-ai/sdk";
import type { TranslatedFields } from "./types.js";
import { createLogger } from "./logger.js";
import { sleep } from "./fetcher.js";

const log = createLogger("translator");

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY env var is required for translation");
    const baseURL = process.env.ANTHROPIC_BASE_URL;
    client = new Anthropic({
      apiKey: key,
      ...(baseURL ? { baseURL } : {}),
    });
  }
  return client;
}

interface TranslateInput {
  slug: string;
  description: string;
  notes?: string[];
  caveats?: string[];
}

export async function translateBatch(
  commands: TranslateInput[]
): Promise<Map<string, TranslatedFields>> {
  const results = new Map<string, TranslatedFields>();
  const batchSize = 10;

  for (let i = 0; i < commands.length; i += batchSize) {
    const batch = commands.slice(i, i + batchSize);
    log.info(
      `Translating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(commands.length / batchSize)} (${batch.length} commands)`
    );

    try {
      const batchResults = await translateBatchSingle(batch);
      for (const [slug, fields] of batchResults) {
        results.set(slug, fields);
      }
    } catch (err: any) {
      log.warn(`Batch failed (${err.message.substring(0, 60)}), retrying one-by-one...`);
      await sleep(1000);
      // Fall back to translating one at a time to isolate bad entries
      for (const cmd of batch) {
        try {
          const single = await translateBatchSingle([cmd]);
          for (const [slug, fields] of single) {
            results.set(slug, fields);
          }
        } catch (singleErr: any) {
          log.error(`Skipping "${cmd.slug}": ${singleErr.message.substring(0, 80)}`);
        }
        await sleep(300);
      }
    }

    if (i + batchSize < commands.length) {
      await sleep(500);
    }
  }

  return results;
}

async function translateBatchSingle(
  batch: TranslateInput[]
): Promise<Map<string, TranslatedFields>> {
  const input = batch.map((cmd) => ({
    slug: cmd.slug,
    description: cmd.description,
    ...(cmd.notes && cmd.notes.length > 0 ? { notes: cmd.notes } : {}),
    ...(cmd.caveats && cmd.caveats.length > 0 ? { caveats: cmd.caveats } : {}),
  }));

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const response = await getClient().messages.create({
    model,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a technical translator for AI CLI tool documentation. Translate the following from English to Simplified Chinese.

Rules:
- Keep technical terms in English: CLI, API, JSON, MCP, token, model, context window, sandbox, prompt, slash command, flag, config, session, repository, commit, diff, lint, debug, cache, timeout, webhook, endpoint, SDK, LLM, embedding
- Keep command names, flag names (--model, /compact, etc.), file paths, and code exactly as-is
- Use concise, professional Chinese suitable for developer documentation
- Return ONLY valid JSON, no markdown fences

Input:
${JSON.stringify(input, null, 2)}

Output format (array matching input order):
[{"slug": "...", "description_zh": "...", "notes_zh": ["...", ...], "caveats_zh": ["...", ...]}]

Only include notes_zh/caveats_zh if the input has notes/caveats.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const text = textBlock?.type === "text" ? textBlock.text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array in response");

  const parsed = JSON.parse(jsonMatch[0]) as Array<{
    slug: string;
    description_zh: string;
    notes_zh?: string[];
    caveats_zh?: string[];
  }>;

  const results = new Map<string, TranslatedFields>();
  for (const item of parsed) {
    results.set(item.slug, {
      description_zh: item.description_zh,
      notes_zh: item.notes_zh,
      caveats_zh: item.caveats_zh,
    });
  }
  return results;
}
