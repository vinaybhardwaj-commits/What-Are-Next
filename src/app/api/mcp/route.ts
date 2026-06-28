import { NextRequest } from "next/server";
import { TOOLS } from "@/lib/mcp/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SERVER = { name: "what-are-next", version: "1.0.0" };
const PROTOCOL = "2024-11-05";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version",
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });
}
function rpcResult(id: any, result: any) { return { jsonrpc: "2.0", id, result }; }
function rpcError(id: any, code: number, message: string) { return { jsonrpc: "2.0", id, error: { code, message } }; }

function authed(req: NextRequest): boolean {
  const token = process.env.MCP_TOKEN;
  if (!token) return false; // fail closed when unconfigured
  const header = req.headers.get("authorization") || "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const url = new URL(req.url);
  const q = url.searchParams.get("k") || url.searchParams.get("token") || "";
  return bearer === token || q === token;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  // Lightweight info probe — no data, no secrets.
  return json({ server: SERVER, transport: "json-rpc over HTTP POST", authorized: authed(req) });
}

async function handleOne(msg: any): Promise<any | null> {
  const { id, method, params } = msg || {};
  // notifications (no id) — acknowledge with no response body
  if (method && method.startsWith("notifications/")) return null;

  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: params?.protocolVersion || PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER,
      });
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) });
    case "tools/call": {
      const name = params?.name;
      const args = params?.arguments ?? {};
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) return rpcError(id, -32601, `Unknown tool: ${name}`);
      try {
        const out = await tool.handler(args);
        return rpcResult(id, { content: [{ type: "text", text: JSON.stringify(out, null, 2) }], isError: false });
      } catch (e: any) {
        return rpcResult(id, { content: [{ type: "text", text: `Error: ${e?.message || String(e)}` }], isError: true });
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export async function POST(req: NextRequest) {
  if (!authed(req)) return json(rpcError(null, -32001, "Unauthorized"), 401);
  let body: any;
  try { body = await req.json(); } catch { return json(rpcError(null, -32700, "Parse error"), 400); }

  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(handleOne))).filter((x) => x !== null);
    return out.length ? json(out) : new Response(null, { status: 202, headers: CORS });
  }
  const res = await handleOne(body);
  return res ? json(res) : new Response(null, { status: 202, headers: CORS });
}
