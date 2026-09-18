const MAX_CHARS = 15000;

/** Fetches a URL and reduces its HTML to plain visible text, for feeding to the AI
 * extractor. Best-effort: sites that require login or render entirely client-side
 * (e.g. LinkedIn) may return little or nothing useful. */
export async function fetchPageText(url: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http/https URLs are supported.");
  }

  const response = await fetch(parsed, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Couldn't fetch that page (HTTP ${response.status}).`);
  }

  const html = await response.text();
  return htmlToText(html).slice(0, MAX_CHARS);
}

function htmlToText(html: string): string {
  const withoutNonContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const withBreaks = withoutNonContent.replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, "\n");
  const withoutTags = withBreaks.replace(/<[^>]+>/g, " ");

  const decoded = withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return decoded
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}
