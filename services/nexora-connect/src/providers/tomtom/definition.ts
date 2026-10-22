import type { ProviderDefinition } from "../../core/types.ts";

import { tomtomActions } from "./actions.ts";

const service = "tomtom";

export const provider: ProviderDefinition = {
  service,
  displayName: "TomTom",
  categories: ["Location", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TOMTOM_API_KEY",
      description:
        "TomTom API key sent as the key query parameter. Create and manage keys at https://developer.tomtom.com/how-to-get-tomtom-api-key.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://developer.tomtom.com",
  actions: tomtomActions,
};
