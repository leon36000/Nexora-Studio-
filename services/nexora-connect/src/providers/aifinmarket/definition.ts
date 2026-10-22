import type { ProviderDefinition } from "../../core/types.ts";

import { aifinMarketActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "aifinmarket",
  displayName: "Wind AIFin Market",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "WIND_API_KEY",
      placeholder: "Enter your WIND_API_KEY",
      description:
        "The WIND_API_KEY used to access Wind financial data. Sign in with your phone number and copy the key from https://aifinmarket.wind.com.cn/#/user/overview.",
    },
  ],
  homepageUrl: "https://aifinmarket.wind.com.cn/#/home",
  actions: aifinMarketActions,
};
