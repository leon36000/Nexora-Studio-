import type { ProviderDefinition } from "../../core/types.ts";

import { checklyActions } from "./actions.ts";

const service = "checkly";

export const provider: ProviderDefinition = {
  service,
  displayName: "Checkly",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "checkly_api_key",
      description:
        "Checkly API key used with the Authorization Bearer header. Create or view API keys in Checkly user API key settings.",
      extraFields: [
        {
          key: "accountId",
          label: "Account ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "checkly_account_id",
          description: "Checkly account ID sent with the x-checkly-account header.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.checklyhq.com",
  actions: checklyActions,
};
