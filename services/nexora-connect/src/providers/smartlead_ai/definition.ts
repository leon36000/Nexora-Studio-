import type { ProviderDefinition } from "../../core/types.ts";

import { smartleadAiActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "smartlead_ai",
  displayName: "Smartlead",
  categories: ["Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SMARTLEAD_API_KEY",
      description:
        "Smartlead API key sent as the api_key query parameter. Generate it from Smartlead Settings > API Keys in https://app.smartlead.ai.",
    },
  ],
  homepageUrl: "https://www.smartlead.ai",
  actions: smartleadAiActions,
};
