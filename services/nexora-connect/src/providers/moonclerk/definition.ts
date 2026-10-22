import type { ProviderDefinition } from "../../core/types.ts";

import { moonclerkActions } from "./actions.ts";

const service = "moonclerk";

export const provider: ProviderDefinition = {
  service,
  displayName: "MoonClerk",
  categories: ["Finance", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MOONCLERK_API_KEY",
      description:
        "MoonClerk API key used in the Authorization header as `Token token=[API Key]`. Generate and view it in MoonClerk settings: https://app.moonclerk.com/settings/api-key.",
    },
  ],
  homepageUrl: "https://moonclerk.com",
  actions: moonclerkActions,
};
