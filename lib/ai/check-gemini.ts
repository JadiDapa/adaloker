import { ApiError } from "@google/genai";
import { gemini, AI_DUMP_MODEL } from "@/lib/gemini";

export type GeminiHealth = { ok: boolean; message: string };

/** Pings the AI dump model with a tiny 1-token request to see whether the shared key
 * can still generate. Gemini has no API to read a remaining balance/credit — the only
 * way to tell "out of quota" from the API is that a real call gets a 429, so this
 * spends a few tokens (negligible on Flash-Lite) rather than calling something free
 * like `countTokens`, which keeps working even when generation quota is exhausted. */
export async function checkGemini(): Promise<GeminiHealth> {
  if (!process.env.GEMINI_API_KEY) {
    return { ok: false, message: "GEMINI_API_KEY isn't set." };
  }

  const startedAt = Date.now();
  try {
    await gemini.models.generateContent({
      model: AI_DUMP_MODEL,
      contents: "Reply with: ok",
      config: { maxOutputTokens: 1 },
    });
    return { ok: true, message: `Working (${AI_DUMP_MODEL}, ${Date.now() - startedAt} ms).` };
  } catch (error) {
    if (!(error instanceof ApiError)) {
      return { ok: false, message: "Couldn't reach Gemini — check the bot's internet connection." };
    }
    switch (error.status) {
      case 429:
        return { ok: false, message: "Out of quota / rate limited (429) — credit or free-tier limit is used up, or too many requests right now." };
      case 400:
      case 401:
      case 403:
        return { ok: false, message: `API key rejected (${error.status}) — the key is invalid, revoked, or billing is disabled.` };
      case 404:
        return { ok: false, message: `Model "${AI_DUMP_MODEL}" not found (404).` };
      default:
        return { ok: false, message: `Gemini error ${error.status}: ${error.message.slice(0, 200)}` };
    }
  }
}
