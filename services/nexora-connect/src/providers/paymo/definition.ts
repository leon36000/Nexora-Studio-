import type { ProviderDefinition } from "../../core/types.ts";

import { paymoActions } from "./actions.ts";

const service = "paymo";

export const provider: ProviderDefinition = {
  service,
  displayName: "Paymo",
  categories: ["Productivity", "Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PAYMO_API_KEY",
      description:
        "Paymo API key used as the Basic Auth username. Generate it from Paymo My Account: https://app.paymoapp.com/#Paymo.module.myaccount/",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.paymoapp.com",
  actions: paymoActions,
};
