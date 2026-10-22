import type { ProviderDefinition } from "../../core/types.ts";

import { cin7CoreActions } from "./actions.ts";

const service = "cin7_core";

export const provider: ProviderDefinition = {
  service,
  displayName: "Cin7 Core",
  categories: ["Data", "Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Application Key",
      placeholder: "CIN7_CORE_API_APPLICATION_KEY",
      description:
        "Cin7 Core API Application Key sent with the api-auth-applicationkey header. Create or view it with the Account ID on the Cin7 Core ExternalAPI setup page after signing in: https://inventory.dearsystems.com/ExternalAPI.",
      extraFields: [
        {
          key: "accountId",
          label: "Account ID",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "CIN7_CORE_ACCOUNT_ID",
          description:
            "Cin7 Core Account ID sent with the api-auth-accountid header. Create or view it with the API Application Key on the Cin7 Core ExternalAPI setup page after signing in: https://inventory.dearsystems.com/ExternalAPI.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.cin7.com/solutions/core/",
  actions: cin7CoreActions,
};
