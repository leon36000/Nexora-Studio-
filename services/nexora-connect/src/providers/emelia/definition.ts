import type { ProviderDefinition } from "../../core/types.ts";

import { emeliaActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "emelia",
  displayName: "Emelia",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "EMELIA_API_KEY",
      description:
        "Emelia API key sent in the Authorization header. Create or view it in Emelia API settings: https://app.emelia.io/settings/api",
    },
  ],
  homepageUrl: "https://emelia.io/",
  actions: emeliaActions,
};
