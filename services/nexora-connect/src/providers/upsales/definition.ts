import type { ProviderDefinition } from "../../core/types.ts";

import { upsalesActions } from "./actions.ts";

const service = "upsales";

export const provider: ProviderDefinition = {
  service,
  displayName: "Upsales",
  categories: ["Marketing", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "upsales_api_key",
      description:
        "Upsales API key sent as the token query parameter. Admin users can manage API keys in Upsales settings; see the official API documentation: https://api.upsales.com/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.upsales.com/",
  actions: upsalesActions,
};
