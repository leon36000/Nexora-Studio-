import type { ProviderDefinition } from "../../core/types.ts";

import { coinmarketcapActions } from "./actions.ts";

const service = "coinmarketcap";

export const provider: ProviderDefinition = {
  service,
  displayName: "CoinMarketCap",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Pro API Key",
      placeholder: "coinmarketcap_pro_api_key",
      description:
        "CoinMarketCap Pro API key used with the X-CMC_PRO_API_KEY header. Sign up at https://pro.coinmarketcap.com to receive it, as documented at https://coinmarketcap.com/api/documentation/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://coinmarketcap.com",
  actions: coinmarketcapActions,
};
