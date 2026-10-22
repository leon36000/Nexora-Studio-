import type { ProviderDefinition } from "../../core/types.ts";

import { twelveDataActions } from "./actions.ts";

const service = "twelve_data";

export const provider: ProviderDefinition = {
  service,
  displayName: "Twelve Data",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TWELVE_DATA_API_KEY",
      description:
        "Twelve Data API key used with the Authorization: apikey header. Sign up and find it in your Twelve Data dashboard as described at https://twelvedata.com/docs.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://twelvedata.com",
  actions: twelveDataActions,
};
