import type { ProviderDefinition } from "../../core/types.ts";

import { brandfetchActions } from "./actions.ts";

const service = "brandfetch";

export const provider: ProviderDefinition = {
  service,
  displayName: "Brandfetch",
  categories: ["Design & Media", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "BRANDFETCH_API_KEY",
      description:
        "Brandfetch API key sent as a Bearer token. Create or view it in the Brandfetch developer dashboard: https://developers.brandfetch.com.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://brandfetch.com",
  actions: brandfetchActions,
};
