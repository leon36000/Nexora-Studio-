import type { ProviderDefinition } from "../../core/types.ts";

import { ringbaActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "ringba",
  displayName: "Ringba",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "RINGBA_API_TOKEN",
      description:
        "Ringba API token sent with the Authorization: Token header. Create one from the API Tokens page in the Ringba portal; see https://developers.ringba.com/.",
      extraFields: [
        {
          key: "accountId",
          label: "Default Account ID",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "RA-account-id",
          description:
            "Optional default Ringba account ID for account-scoped actions. Use get_account to list the accounts accessible to this token.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.ringba.com",
  actions: ringbaActions,
};
