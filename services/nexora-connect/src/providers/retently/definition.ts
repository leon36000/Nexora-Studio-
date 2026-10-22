import type { ProviderDefinition } from "../../core/types.ts";

import { retentlyActions } from "./actions.ts";

const service = "retently";

export const provider: ProviderDefinition = {
  service,
  displayName: "Retently",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "RETENTLY_API_KEY",
      description:
        "Retently API key sent in the X-Api-Key header. Create and manage API keys in Retently account settings, and see the official authentication docs: https://help.retently.com/en/articles/13106739-api-authentication-options.",
    },
  ],
  homepageUrl: "https://www.retently.com/",
  actions: retentlyActions,
};
