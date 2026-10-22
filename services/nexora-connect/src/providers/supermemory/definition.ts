import type { ProviderDefinition } from "../../core/types.ts";

import { supermemoryActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "supermemory",
  displayName: "Supermemory",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "sm_...",
      description: "Supermemory API key sent as a Bearer token. Create one at https://console.supermemory.ai.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://supermemory.ai",
  actions: supermemoryActions,
};
