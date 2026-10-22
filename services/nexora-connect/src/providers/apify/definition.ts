import type { ProviderDefinition } from "../../core/types.ts";

import { apifyActions } from "./actions.ts";

const service = "apify";

export const provider: ProviderDefinition = {
  service,
  displayName: "Apify",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "apify_api_...",
      description:
        "Apify API token used with the Authorization Bearer header. Create it in Apify Console settings: https://console.apify.com/settings/integrations.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://apify.com",
  actions: apifyActions,
};
