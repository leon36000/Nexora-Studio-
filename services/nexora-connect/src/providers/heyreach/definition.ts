import type { ProviderDefinition } from "../../core/types.ts";

import { heyreachActions } from "./actions.ts";

const service = "heyreach";

export const provider: ProviderDefinition = {
  service,
  displayName: "HeyReach",
  categories: ["Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "HEYREACH_API_KEY",
      description:
        "HeyReach API key sent with the X-API-KEY request header. Create or copy it from Settings > API in your HeyReach account: https://app.heyreach.io/account/login.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.heyreach.io",
  actions: heyreachActions,
};
