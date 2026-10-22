import type { ProviderDefinition } from "../../core/types.ts";

import { slabActions } from "./actions.ts";

const service = "slab";

export const provider: ProviderDefinition = {
  service,
  displayName: "Slab",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "SLAB_API_TOKEN",
      description:
        "Slab API token sent as an Authorization Bearer token. Copy the token from Team settings > Developer in Slab.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://slab.com",
  actions: slabActions,
};
