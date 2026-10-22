import type { ProviderDefinition } from "../../core/types.ts";

import { datagmaActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "datagma",
  displayName: "Datagma",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DATAGMA_API_KEY",
      description:
        "Datagma API key sent as the apiId query parameter. Get or view it in the Datagma API dashboard: https://app.datagma.com/user-api",
    },
  ],
  homepageUrl: "https://datagma.com/",
  actions: datagmaActions,
};
