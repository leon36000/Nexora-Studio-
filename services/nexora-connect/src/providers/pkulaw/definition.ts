import type { ProviderDefinition } from "../../core/types.ts";

import { pkulawActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "pkulaw",
  displayName: "PKULaw",
  categories: ["Data", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "Paste your PKULaw Access Token",
      description:
        "Access Token used for PKULaw MCP Bearer authentication. Create one and enable MCP services at https://mcp.pkulaw.com/console/apps.",
    },
  ],
  homepageUrl: "https://mcp.pkulaw.com",
  actions: pkulawActions,
};
