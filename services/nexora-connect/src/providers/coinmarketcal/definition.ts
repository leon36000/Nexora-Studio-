import type { ProviderDefinition } from "../../core/types.ts";

import { coinmarketcalActions } from "./actions.ts";

const service = "coinmarketcal";

export const provider: ProviderDefinition = {
  service,
  displayName: "CoinMarketCal",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "COINMARKETCAL_API_KEY",
      description:
        "CoinMarketCal API key sent with the x-api-key header. Request API access from the official API site: https://coinmarketcal.com/en/api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://coinmarketcal.com",
  actions: coinmarketcalActions,
};
