// OpenAI function calling docs: https://platform.openai.com/docs/guides/function-calling

import { adminHeaders, fetchJson } from "../local-http/client.ts";

interface CatalogAction {
  id: string;
  description: string;
  inputSchema: unknown;
}

interface OpenAiFunctionTool {
  type: "function";
  name: string;
  description: string;
  parameters: unknown;
}

const actions = await fetchJson<CatalogAction[]>("http://localhost:3000/api/actions", {
  headers: adminHeaders(),
});
const tools: OpenAiFunctionTool[] = actions.map((action) => ({
  type: "function",
  name: toOpenAiToolName(action.id),
  description: action.description,
  parameters: action.inputSchema,
}));

console.log(`Converted ${tools.length} connector actions into OpenAI function tools.`);
for (const tool of tools.slice(0, 10)) {
  console.log(`- ${tool.name}: ${tool.description}`);
}

function toOpenAiToolName(actionId: string): string {
  return actionId.replaceAll(".", "__");
}
