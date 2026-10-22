import type { ProviderDefinition } from "../../core/types.ts";

import { sifActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "sif",
  displayName: "Sif",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "MCP Key",
      placeholder: "Paste your Sif MCP key",
      description:
        "The secret key for Sif's Amazon analysis MCP service. Create it at https://www.sif.com/mcp?tab=secret.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.sif.com",
  actions: sifActions,
};
