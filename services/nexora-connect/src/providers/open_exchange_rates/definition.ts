import type { ProviderDefinition } from "../../core/types.ts";

import { openExchangeRatesActions } from "./actions.ts";

const service = "open_exchange_rates";

export const provider: ProviderDefinition = {
  service,
  displayName: "Open Exchange Rates",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "App ID",
      placeholder: "OPEN_EXCHANGE_RATES_APP_ID",
      description:
        "Open Exchange Rates App ID sent with the app_id query parameter. Get it from your dashboard: https://openexchangerates.org/account/app-ids.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://openexchangerates.org",
  actions: openExchangeRatesActions,
};
