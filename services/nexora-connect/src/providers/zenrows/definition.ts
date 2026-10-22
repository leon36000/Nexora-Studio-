import type { ProviderDefinition } from "../../core/types.ts";

import { zenrowsActions } from "./actions.ts";

const service = "zenrows";

export const provider: ProviderDefinition = {
  service,
  displayName: "ZenRows",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ZENROWS_API_KEY",
      description:
        "ZenRows API key used as the apikey query parameter for scraper requests and the X-API-Key header for usage lookup. Find or create it in your ZenRows Builder dashboard: https://app.zenrows.com/builder.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.zenrows.com/",
  actions: zenrowsActions,
};
