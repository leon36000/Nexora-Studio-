import type { ProviderDefinition } from "../../core/types.ts";

import { tisaneActions } from "./actions.ts";

const service = "tisane";

export const provider: ProviderDefinition = {
  service,
  displayName: "Tisane",
  categories: ["AI", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Subscription Key",
      placeholder: "TISANE_API_KEY",
      description:
        "Tisane API subscription key sent in the Ocp-Apim-Subscription-Key header. View your key in the Tisane Developer Portal.",
    },
  ],
  homepageUrl: "https://tisane.ai",
  actions: tisaneActions,
};
