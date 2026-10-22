import type { ProviderDefinition } from "../../core/types.ts";

import { currencyscoopActions } from "./actions.ts";

const service = "currencyscoop";

export const provider: ProviderDefinition = {
  service,
  displayName: "CurrencyBeacon",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CURRENCYBEACON_API_KEY",
      description:
        "CurrencyBeacon API key sent with the api_key query parameter. Get it from https://currencybeacon.com/account/dashboard.",
    },
  ],
  homepageUrl: "https://currencybeacon.com",
  actions: currencyscoopActions,
};
