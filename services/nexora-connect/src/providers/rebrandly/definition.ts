import type { ProviderDefinition } from "../../core/types.ts";

import { rebrandlyActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "rebrandly",
  displayName: "Rebrandly",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "REBRANDLY_API_KEY",
      description:
        "Rebrandly API key sent with the apikey header. Create or view API keys in the Rebrandly dashboard: https://app.rebrandly.com/settings/api-keys.",
    },
  ],
  homepageUrl: "https://www.rebrandly.com",
  actions: rebrandlyActions,
};
