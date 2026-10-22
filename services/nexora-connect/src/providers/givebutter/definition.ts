import type { ProviderDefinition } from "../../core/types.ts";

import { givebutterActions } from "./actions.ts";

const service = "givebutter";

/**
 * Givebutter provider backed by the Givebutter REST API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Givebutter",
  categories: ["Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "GIVEBUTTER_API_KEY",
      description:
        "Givebutter API key sent as a Bearer token in the Authorization header. Create and manage API keys in the Givebutter dashboard: https://dashboard.givebutter.com/",
      extraFields: [],
    },
  ],
  homepageUrl: "https://givebutter.com",
  actions: givebutterActions,
};
