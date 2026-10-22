import type { ProviderDefinition } from "../../core/types.ts";

import { searchApiActions } from "./actions.ts";

const service = "search_api";

export const provider: ProviderDefinition = {
  service,
  displayName: "SearchApi",
  categories: ["Data", "Location"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SEARCHAPI_API_KEY",
      description:
        "SearchApi API key passed as the api_key query parameter. Find it on the SearchApi homepage after signing in: https://www.searchapi.io/.",
    },
  ],
  homepageUrl: "https://www.searchapi.io",
  actions: searchApiActions,
};
