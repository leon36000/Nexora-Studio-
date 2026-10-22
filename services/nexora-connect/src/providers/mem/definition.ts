import type { ProviderDefinition } from "../../core/types.ts";

import { memActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "mem",
  displayName: "Mem",
  categories: ["Productivity", "AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MEM_API_KEY",
      description:
        "Mem API key sent as a Bearer token. Create or view it in the API section of your Mem settings: https://app.mem.ai/settings/api.",
    },
  ],
  homepageUrl: "https://mem.ai",
  actions: memActions,
};
