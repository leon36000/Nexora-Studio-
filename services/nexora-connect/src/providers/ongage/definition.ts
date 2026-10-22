import type { ProviderDefinition } from "../../core/types.ts";

import { ongageActions } from "./actions.ts";

const service = "ongage";

export const provider: ProviderDefinition = {
  service,
  displayName: "Ongage",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ONGAGE_API_KEY",
      description: "Ongage API key sent in the x-api-key header. Create it from the API Keys tab in Ongage.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.ongage.com/",
  actions: ongageActions,
};
