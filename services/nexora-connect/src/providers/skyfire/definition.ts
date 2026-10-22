import type { ProviderDefinition } from "../../core/types.ts";

import { skyfireActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "skyfire",
  displayName: "Skyfire",
  categories: ["Finance", "AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "skyfire_...",
      description:
        "Skyfire Buyer or Seller agent API key sent with the skyfire-api-key header. Create it in the Skyfire Dashboard for your agent account: https://app.skyfire.xyz/.",
    },
  ],
  homepageUrl: "https://skyfire.xyz",
  actions: skyfireActions,
};
