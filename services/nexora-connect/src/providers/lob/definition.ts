import type { ProviderDefinition } from "../../core/types.ts";

import { lobActions } from "./actions.ts";

const service = "lob";

export const provider: ProviderDefinition = {
  service,
  displayName: "Lob",
  categories: ["Marketing", "Location"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "live_...",
      description:
        "Lob API key used with HTTP Basic authentication. Create or view API keys in the Lob dashboard under Settings > API Keys: https://dashboard.lob.com/#/settings/api-keys.",
    },
  ],
  homepageUrl: "https://www.lob.com",
  actions: lobActions,
};
