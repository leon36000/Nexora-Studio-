import type { ProviderDefinition } from "../../core/types.ts";

import { beaconchainActions } from "./actions.ts";

const service = "beaconchain";

export const provider: ProviderDefinition = {
  service,
  displayName: "Beaconcha.in",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "beaconchain_api_key",
      description:
        "Beaconcha.in API key sent with the Authorization Bearer header. Get or manage it in the Beaconcha.in user portal: https://beaconcha.in/user/api-key-management",
    },
  ],
  homepageUrl: "https://beaconcha.in",
  actions: beaconchainActions,
};
