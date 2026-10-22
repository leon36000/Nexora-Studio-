import type { ProviderDefinition } from "../../core/types.ts";

import { magileadsActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "magileads",
  displayName: "Magileads",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MAGILEADS_API_KEY",
      description:
        "Magileads API key sent in the X-API-Key header. Request or view API keys from the Settings section of your Magileads account: https://www.magileads.com/en/api/.",
    },
  ],
  homepageUrl: "https://www.magileads.com/",
  actions: magileadsActions,
};
