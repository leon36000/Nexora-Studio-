import type { ProviderDefinition } from "../../core/types.ts";

import { pexelsActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "pexels",
  displayName: "Pexels",
  categories: ["Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PEXELS_API_KEY",
      description:
        "Pexels API key sent in the Authorization header for api.pexels.com requests. Get it from https://www.pexels.com/api/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.pexels.com",
  actions: pexelsActions,
};
