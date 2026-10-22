import type { ProviderDefinition } from "../../core/types.ts";

import { route4meActions } from "./actions.ts";

const service = "route4me";

export const provider: ProviderDefinition = {
  service,
  displayName: "Route4Me",
  categories: ["Location", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ROUTE4ME_API_KEY",
      description: "Route4Me API key passed as the api_key query parameter.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://route4me.com",
  actions: route4meActions,
};
