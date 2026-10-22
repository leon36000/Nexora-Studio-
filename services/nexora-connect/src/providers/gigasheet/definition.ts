import type { ProviderDefinition } from "../../core/types.ts";

import { gigasheetActions } from "./actions.ts";

const service = "gigasheet";

/**
 * Gigasheet provider backed by the public Gigasheet API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Gigasheet",
  categories: ["Data", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "gigasheet_api_key",
      description:
        "Gigasheet API key sent in the X-GIGASHEET-TOKEN header. Follow the Authentication guide to create a token, or contact support@gigasheet.com for API access instructions: https://gigasheet.readme.io/reference/authentication",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.gigasheet.com",
  actions: gigasheetActions,
};
