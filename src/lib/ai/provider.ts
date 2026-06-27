import "server-only";
import { VertexAI } from "@google-cloud/vertexai";

/**
 * modelProvider seam (PRD §8.1): a feature names a *capability*, not a model.
 * Model choice is config; a local Qwen instance is a drop-in alternative
 * behind the same interface. Vertex is the only v1 implementation (no PHI here).
 */
export type Capability =
  | "clarify"      // capture parsing — fast
  | "autolink"     // suggest initiative/goal — fast
  | "brief"        // daily brief — fast/medium
  | "review"       // weekly review copilot — strong
  | "critique"     // Rumelt kernel critique — strong
  | "nudge"        // draft follow-up message — fast
  | "assistant";   // omnipresent ⌘J — strong, tool-calling

const STRONG = () => process.env.GEMINI_MODEL_REASONING || "gemini-2.5-pro";
const FAST = () => process.env.GEMINI_MODEL_UTILITY || "gemini-2.5-flash";

function modelFor(cap: Capability): string {
  switch (cap) {
    case "review":
    case "critique":
    case "assistant":
      return STRONG();
    default:
      return FAST();
  }
}

/** Decode the base64 service-account JSON into ADC creds for Vertex. */
function credentials() {
  const b64 = process.env.GCP_SA_KEY_BASE64;
  if (!b64) return undefined;
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
}

let _vertex: VertexAI | null = null;
function vertex(): VertexAI {
  if (_vertex) return _vertex;
  const project = process.env.GCP_PROJECT_ID!;
  const location = process.env.GCP_LOCATION || "asia-northeast1";
  const creds = credentials();
  _vertex = new VertexAI({
    project,
    location,
    googleAuthOptions: creds ? { credentials: creds } : undefined,
  });
  return _vertex;
}

export interface ModelProvider {
  /** Non-streaming completion. */
  complete(cap: Capability, prompt: string, system?: string): Promise<string>;
}

export const vertexProvider: ModelProvider = {
  async complete(cap, prompt, system) {
    const model = vertex().getGenerativeModel({
      model: modelFor(cap),
      systemInstruction: system ? { role: "system", parts: [{ text: system }] } : undefined,
    });
    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    return res.response.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
  },
};

export const ai = vertexProvider;
export { modelFor };
