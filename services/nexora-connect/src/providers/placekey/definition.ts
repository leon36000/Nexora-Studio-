import type { ProviderDefinition } from "../../core/types.ts";

import { placekeyActions } from "./actions.ts";

const service = "placekey";

export const provider: ProviderDefinition = {
  service,
  displayName: "Placekey",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "pk_live_...",
      description:
        "Placekey API key used with the apikey request header. Generate it from the Placekey Developer Portal dashboard: https://docs.placekey.io/documentation/api-overview/authentication.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.placekey.io",
  actions: placekeyActions,
};
