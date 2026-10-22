import type { ProviderDefinition } from "../../core/types.ts";

import { eodhdApisActions } from "./actions.ts";

const service = "eodhd_apis";

export const provider: ProviderDefinition = {
  service,
  displayName: "EODHD APIs",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "EODHD_API_TOKEN",
      description:
        "EODHD API token sent as the api_token query parameter. Manage API access from your EODHD dashboard: https://eodhd.com/cp/settings/api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://eodhd.com",
  actions: eodhdApisActions,
};
