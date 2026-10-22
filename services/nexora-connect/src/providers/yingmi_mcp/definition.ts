import type { ProviderDefinition } from "../../core/types.ts";

import { yingmiMcpActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "yingmi_mcp",
  displayName: "Yingmi MCP",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "Paste your Yingmi MCP API Key",
      description: "API Key sent in the x-api-key header. Apply and copy it from https://qieman.com/mcp/account.",
    },
  ],
  homepageUrl: "https://qieman.com/mcp/mcp-market",
  actions: yingmiMcpActions,
};
