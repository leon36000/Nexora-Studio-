import type { ProviderDefinition } from "../../core/types.ts";

import { censusBureauActions } from "./actions.ts";

const service = "census_bureau";

export const provider: ProviderDefinition = {
  service,
  displayName: "Census Bureau",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CENSUS_API_KEY",
      description:
        "Census Data API key passed as the key query parameter. Request or manage keys at https://api.census.gov/data/key_signup.html.",
    },
  ],
  homepageUrl: "https://www.census.gov",
  actions: censusBureauActions,
};
