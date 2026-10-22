import type { ProviderDefinition } from "../../core/types.ts";

import { chargeblastActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "chargeblast",
  displayName: "Chargeblast",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CHARGEBLAST_API_KEY",
      description:
        "Chargeblast API key sent with the X-API-Key header. Get it from the Chargeblast developer settings page: https://app.chargeblast.com/settings/developer",
    },
  ],
  homepageUrl: "https://www.chargeblast.com",
  actions: chargeblastActions,
};
