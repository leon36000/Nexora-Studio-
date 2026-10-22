import type { ProviderDefinition } from "../../core/types.ts";

import { serphouseActions } from "./actions.ts";

const service = "serphouse";

export const provider: ProviderDefinition = {
  service,
  displayName: "SERPHouse",
  categories: ["Data", "Location"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SERPHOUSE_API_KEY",
      description:
        "SERPHouse API key used as a Bearer token. Find it in the SERPHouse account dashboard after signing in at https://app.serphouse.com/login.",
    },
  ],
  homepageUrl: "https://www.serphouse.com",
  actions: serphouseActions,
};
