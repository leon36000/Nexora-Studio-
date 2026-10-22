import type { ProviderDefinition } from "../../core/types.ts";

import { sumupActions } from "./actions.ts";
export const provider: ProviderDefinition = {
  service: "sumup",
  displayName: "SumUp",
  categories: ["Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Secret API Key",
      placeholder: "sk_live_...",
      description: "SumUp secret or restricted API key. Create and manage API keys at https://me.sumup.com/developers.",
    },
  ],
  homepageUrl: "https://www.sumup.com",
  actions: sumupActions,
};
