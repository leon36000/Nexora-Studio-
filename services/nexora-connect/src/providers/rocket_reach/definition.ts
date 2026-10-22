import type { ProviderDefinition } from "../../core/types.ts";

import { rocketReachActions } from "./actions.ts";

const service = "rocket_reach";

export const provider: ProviderDefinition = {
  service,
  displayName: "RocketReach",
  categories: ["Communication", "Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ROCKETREACH_API_KEY",
      description: "RocketReach API key used with the Api-Key header. Generate it from your Account Settings.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://rocketreach.co",
  actions: rocketReachActions,
};
