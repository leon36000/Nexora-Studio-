import type { ProviderDefinition } from "../../core/types.ts";

import { yelpActions } from "./actions.ts";

const service = "yelp";

export const provider: ProviderDefinition = {
  service,
  displayName: "Yelp",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YELP_API_KEY",
      description:
        "Yelp private API key used with the Authorization: Bearer <api_key> header. Create an app to get your API key at https://docs.developer.yelp.com/docs/fusion-authentication.",
    },
  ],
  homepageUrl: "https://www.yelp.com",
  actions: yelpActions,
};
