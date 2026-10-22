import type { ProviderDefinition } from "../../core/types.ts";

import { asinDataApiActions } from "./actions.ts";

const service = "asin_data_api";

export const provider: ProviderDefinition = {
  service,
  displayName: "ASIN Data API",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "ASIN Data API Key",
      placeholder: "ASIN_DATA_API_KEY",
      description:
        "ASIN Data API key sent as the api_key query parameter. Find or manage it in the ASIN Data API dashboard: https://app.asindataapi.com/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.asindataapi.com",
  actions: asinDataApiActions,
};
