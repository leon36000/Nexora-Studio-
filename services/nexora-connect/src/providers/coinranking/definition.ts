import type { ProviderDefinition } from "../../core/types.ts";

import { coinrankingActions } from "./actions.ts";

const service = "coinranking";

export const provider: ProviderDefinition = {
  service,
  displayName: "Coinranking",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "coinranking_api_key",
      description:
        "Coinranking API key sent with the x-access-token header. After signing up, copy it from your dashboard overview: https://coinranking.com/api/documentation.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://coinranking.com",
  actions: coinrankingActions,
};
