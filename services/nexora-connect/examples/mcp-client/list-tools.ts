// MCP tools endpoint exposed by the local runtime.

import { fetchJson, runtimeHeaders } from "../local-http/client.ts";

const payload = await fetchJson<{
  tools?: Array<{ name: string; description: string; inputSchema: unknown }>;
}>("http://localhost:3000/mcp/tools", {
  headers: runtimeHeaders(),
});
const tools = payload.tools ?? [];

console.log(`Found ${tools.length} MCP-style tools.`);
for (const tool of tools.slice(0, 10)) {
  console.log(`- ${tool.name}: ${tool.description}`);
}
