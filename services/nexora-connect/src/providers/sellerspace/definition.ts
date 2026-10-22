import type { ProviderDefinition } from "../../core/types.ts";

import { sellerspaceActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "sellerspace",
  displayName: "SellerSpace",
  categories: ["Productivity", "Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "MCP Key",
      placeholder: "sk-ss-...",
      description:
        "SellerSpace MCP key sent in the x-api-key header. Create it by following https://www.sellerspace.com/help/doc/how-to-get-your-sellerspace-mcp-key .",
    },
  ],
  homepageUrl: "https://www.sellerspace.com/",
  actions: sellerspaceActions,
};
