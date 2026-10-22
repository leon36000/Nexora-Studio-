import type { ProviderDefinition } from "../../core/types.ts";

import { payhipActions } from "./actions.ts";

const service = "payhip";

export const provider: ProviderDefinition = {
  service,
  displayName: "Payhip",
  categories: ["Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "payhip_api_key",
      description:
        "Payhip API key sent in the payhip-api-key header for coupon endpoints. Find it in Payhip Dashboard > Settings > Advanced: https://payhip.com/support/api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://payhip.com/",
  actions: payhipActions,
};
