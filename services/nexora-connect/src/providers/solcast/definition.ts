import type { ProviderDefinition } from "../../core/types.ts";

import { solcastActions } from "./actions.ts";

const service = "solcast";

export const provider: ProviderDefinition = {
  service,
  displayName: "Solcast",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SOLCAST_API_KEY",
      description:
        "Solcast API key sent with the Authorization Bearer header. Get it after signing in to the Solcast API Toolkit: https://toolkit.solcast.com.au/",
      extraFields: [],
    },
  ],
  homepageUrl: "https://solcast.com",
  actions: solcastActions,
};
