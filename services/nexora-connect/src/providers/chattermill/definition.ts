import type { ProviderDefinition } from "../../core/types.ts";

import { chattermillActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "chattermill",
  displayName: "Chattermill",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "chattermill_api_key",
      description:
        "Chattermill API key sent as a Bearer token in the Authorization header. Create or copy it from the Chattermill API settings page: https://app.chattermill.com/settings/api.",
    },
  ],
  homepageUrl: "https://chattermill.com",
  actions: chattermillActions,
};
