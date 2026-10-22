import type { ProviderDefinition } from "../../core/types.ts";

import { usptoActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "uspto",
  displayName: "USPTO",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_USPTO_API_KEY",
      description:
        "USPTO API key sent in the USPTO-API-KEY header. Request or view your key in the official API Key Manager: https://account.uspto.gov/api-manager/.",
    },
  ],
  homepageUrl: "https://www.uspto.gov/",
  actions: usptoActions,
};
