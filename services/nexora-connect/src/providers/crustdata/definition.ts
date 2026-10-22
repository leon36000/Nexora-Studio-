import type { ProviderDefinition } from "../../core/types.ts";

import { crustdataActions } from "./actions.ts";

const service = "crustdata";

export const provider: ProviderDefinition = {
  service,
  displayName: "Crustdata",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CRUSTDATA_API_KEY",
      description:
        "Crustdata API key used with the Authorization Bearer header. Create or view it from the official Crustdata dashboard: https://crustdata.com/demo",
      extraFields: [],
    },
  ],
  homepageUrl: "https://crustdata.com",
  actions: crustdataActions,
};
