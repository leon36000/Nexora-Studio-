import type { ProviderDefinition } from "../../core/types.ts";

import { aeroleadsActions } from "./actions.ts";

const service = "aeroleads";

export const provider: ProviderDefinition = {
  service,
  displayName: "AeroLeads",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "aeroleads_api_key",
      description:
        "AeroLeads API key sent as the api_key query parameter for LinkedIn and email lookup APIs. Find it in AeroLeads Settings under API Key after signing in: https://aeroleads.com/users/settings#api_key.",
    },
  ],
  homepageUrl: "https://aeroleads.com",
  actions: aeroleadsActions,
};
