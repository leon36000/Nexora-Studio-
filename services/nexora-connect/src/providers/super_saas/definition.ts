import type { ProviderDefinition } from "../../core/types.ts";

import { superSaasActions } from "./actions.ts";

const service = "super_saas";

export const provider: ProviderDefinition = {
  service,
  displayName: "SuperSaaS",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SUPERSAAS_API_KEY",
      description:
        "SuperSaaS account API key sent with the account name on API requests. Generate it at the bottom of Account Info after signing in: https://www.supersaas.com/accounts/edit#api_key.",
      extraFields: [
        {
          key: "accountName",
          label: "Account Name",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "your_account_name",
          description:
            "The SuperSaaS account name sent with API requests. It is the account identifier used in your SuperSaaS dashboard and API examples.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.supersaas.com/",
  actions: superSaasActions,
};
