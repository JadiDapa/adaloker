import { GoogleGenAI } from "@google/genai";

const globalForGemini = global as unknown as { gemini: GoogleGenAI };

export const gemini =
  globalForGemini.gemini ?? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

if (process.env.NODE_ENV !== "production") globalForGemini.gemini = gemini;

// Flash-Lite is plenty for structured extraction out of a short text dump,
// and it's the cheapest/fastest tier — this app pays for every user's dump
// out of one shared key, so cost per call matters more than raw quality here.
export const AI_DUMP_MODEL = "gemini-3.5-flash-lite";
