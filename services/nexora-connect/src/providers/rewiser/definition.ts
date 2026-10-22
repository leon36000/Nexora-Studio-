import type { ProviderDefinition } from "../../core/types.ts";

import { rewiserActions } from "./actions.ts";
export const provider: ProviderDefinition = {
  service: "rewiser",
  displayName: "Rewiser",
  categories: ["Finance", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "rwsk_live_...",
      description:
        "Rewiser API key sent as a Bearer token. Generate one in Settings > API Keys at https://app.rewiser.io.",
    },
  ],
  homepageUrl: "https://rewiser.io",
  actions: rewiserActions,
};
