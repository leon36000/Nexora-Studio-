import type { ProviderDefinition } from "../../core/types.ts";

import { currencyapiActions } from "./actions.ts";

const service = "currencyapi";

export const provider: ProviderDefinition = {
  service,
  displayName: "currencyapi",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CURRENCYAPI_API_KEY",
      description:
        "currencyapi API key sent with the apikey header. Get it from https://app.currencyapi.com/dashboard.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://currencyapi.com",
  actions: currencyapiActions,
};
