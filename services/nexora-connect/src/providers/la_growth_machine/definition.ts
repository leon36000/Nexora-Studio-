import type { ProviderDefinition } from "../../core/types.ts";

import { laGrowthMachineActions } from "./actions.ts";

const service = "la_growth_machine";

/**
 * La Growth Machine API provider.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "La Growth Machine",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "LGM_API_KEY",
      description:
        "La Growth Machine API key sent with the Authorization: Bearer header. Create or view it in La Growth Machine API settings: https://app.lagrowthmachine.com/settings/api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://lagrowthmachine.com",
  actions: laGrowthMachineActions,
};
