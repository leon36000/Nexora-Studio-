import type { ProviderDefinition } from "../../core/types.ts";

import { headoutActions } from "./actions.ts";

const service = "headout";

export const provider: ProviderDefinition = {
  service,
  displayName: "Headout",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "pk_...",
      description:
        "Headout API key sent with the Headout-Auth header. Sign up on the official affiliate platform to receive production and testing keys by email: https://partner.headout.com/affiliate",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.headout.com",
  actions: headoutActions,
};
