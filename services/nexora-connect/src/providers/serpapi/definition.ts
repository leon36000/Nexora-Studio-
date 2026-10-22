import type { ProviderDefinition } from "../../core/types.ts";

import { serpapiActions } from "./actions.ts";

const service = "serpapi";

export const provider: ProviderDefinition = {
  service,
  displayName: "SerpApi",
  categories: ["Data", "Location"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SERPAPI_API_KEY",
      description:
        "SerpApi API key passed as the api_key query parameter. Find or manage it at https://serpapi.com/manage-api-key.",
    },
  ],
  homepageUrl: "https://serpapi.com",
  actions: serpapiActions,
};
