import type { ProviderDefinition } from "../../core/types.ts";

import { apiverveActions } from "./actions.ts";

const service = "apiverve";

export const provider: ProviderDefinition = {
  service,
  displayName: "APIVerve",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "APIVERVE_API_KEY",
      description:
        "APIVerve API key passed in the X-API-Key request header. Create a free account at https://dashboard.apiverve.com/signup, then find the key in the API Keys section of https://dashboard.apiverve.com.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://apiverve.com/",
  actions: apiverveActions,
};
