import type { ProviderDefinition } from "../../core/types.ts";

import { geckoboardActions } from "./actions.ts";

const service = "geckoboard";

/**
 * Geckoboard Datasets API provider.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Geckoboard",
  categories: ["Data", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "GECKOBOARD_API_KEY",
      description:
        "Geckoboard API key used as the HTTP Basic username. Find it in Geckoboard Account details under API Key: https://developer.geckoboard.com/#find-your-api-key",
    },
  ],
  homepageUrl: "https://www.geckoboard.com/",
  actions: geckoboardActions,
};
