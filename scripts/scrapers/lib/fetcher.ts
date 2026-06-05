import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchHtml(url: string, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        redirect: "follow",
      });
      if (res.ok) return await res.text();
      if (res.status === 404) throw new Error(`404 Not Found: ${url}`);
      if (res.status === 403) throw new Error(`403 Forbidden: ${url}`);
      if (attempt < retries) {
        await sleep(1000 * Math.pow(2, attempt - 1));
        continue;
      }
      throw new Error(`HTTP ${res.status} after ${retries} attempts: ${url}`);
    } catch (err: any) {
      if (err.message?.includes("404") || err.message?.includes("403")) throw err;
      if (attempt < retries) {
        await sleep(1000 * Math.pow(2, attempt - 1));
        continue;
      }
      throw err;
    }
  }
  throw new Error("unreachable");
}

export function parseHtml(html: string): cheerio.CheerioAPI {
  return cheerio.load(html);
}

export async function fetchAndParse(url: string): Promise<cheerio.CheerioAPI> {
  const html = await fetchHtml(url);
  return parseHtml(html);
}

export async function fetchMarkdown(url: string, retries = 3): Promise<string> {
  return fetchHtml(url, retries);
}

export async function fetchGitHubFile(
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.raw",
    "User-Agent": USER_AGENT,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetch(apiUrl, { headers });

  if (res.ok) return await res.text();

  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
  const rawRes = await fetch(rawUrl, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (rawRes.ok) return await rawRes.text();

  throw new Error(
    `Failed to fetch GitHub file ${owner}/${repo}/${path}: API ${res.status}, raw ${rawRes.status}`
  );
}

export async function fetchWithPlaywright(url: string, waitSelector?: string): Promise<string> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    if (waitSelector) {
      await page.waitForSelector(waitSelector, { timeout: 10000 }).catch(() => {});
    }
    await sleep(2000);
    return await page.content();
  } finally {
    await browser.close();
  }
}

export async function fetchGitHubDirectory(
  owner: string,
  repo: string,
  path: string
): Promise<Array<{ name: string; path: string; download_url: string | null }>> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": USER_AGENT,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetch(url, { headers });

  if (!res.ok)
    throw new Error(`GitHub API ${res.status} for ${owner}/${repo}/${path}`);

  const data = (await res.json()) as Array<{
    name: string;
    path: string;
    download_url: string | null;
    type: string;
  }>;
  return data
    .filter((f) => f.type === "file")
    .map((f) => ({ name: f.name, path: f.path, download_url: f.download_url }));
}
