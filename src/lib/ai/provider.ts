import "server-only";
import { VertexAI } from "@google-cloud/vertexai";

/**
 * modelProvider seam (PRD §8.1): a feature names a *capability*, not a model.
 * Vertex is the only v1 implementation (no PHI here). Local Qwen is a drop-in
 * behind the same interface.
 */
export type Capability =
  | "clarify" | "autolink" | "brief" | "review" | "critique" | "nudge" | "assistant";

const STRONG = () => process.env.GEMINI_MODEL_REASONING || "gemini-2.5-pro";
const FAST = () => process.env.GEMINI_MODEL_UTILITY || "gemini-2.5-flash";

function modelFor(cap: Capability): string {
  switch (cap) {
    case "review": case "critique": case "assistant": return STRONG();
    default: return FAST();
  }
}

function credentials() {
  const b64 = process.env.GCP_SA_KEY_BASE64;
  if (!b64) return undefined;
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
}

let _vertex: VertexAI | null = null;
function vertex(): VertexAI {
  if (_vertex) return _vertex;
  const creds = credentials();
  _vertex = new VertexAI({
    project: process.env.GCP_PROJECT_ID!,
    location: process.env.GCP_LOCATION || "asia-northeast1",
    googleAuthOptions: creds ? { credentials: creds } : undefined,
  });
  return _vertex;
}

function model(cap: Capability, system?: string, json = false) {
  return vertex().getGenerativeModel({
    model: modelFor(cap),
    systemInstruction: system ? { role: "system", parts: [{ text: system }] } : undefined,
    generationConfig: json ? { responseMimeType: "application/json", temperature: 0.4 } : { temperature: 0.6 },
  });
}

export const ai = {
  async complete(cap: Capability, prompt: string, system?: string): Promise<string> {
    const res = await model(cap, system).generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
    return res.response.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
  },
  async completeJSON<T = any>(cap: Capability, prompt: string, system?: string): Promise<T> {
    const res = await model(cap, system, true).generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
    const txt = res.response.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "{}";
    try { return JSON.parse(txt) as T; }
    catch { return JSON.parse(txt.replace(/^```json\s*|\s*```$/g, "")) as T; }
  },
};
export const vertexProvider = ai;
export { modelFor };
