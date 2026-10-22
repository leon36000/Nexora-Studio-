import type { ProviderDefinition } from "../../core/types.ts";

import { referralRockActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "referralrock",
  displayName: "Referral Rock",
  categories: ["Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Public API Key",
      placeholder: "PUBLIC_API_KEY",
      description: "Referral Rock public API key used as the HTTP Basic username.",
      extraFields: [
        {
          key: "privateKey",
          label: "Private API Key",
          required: true,
          secret: true,
          inputType: "password",
          placeholder: "PRIVATE_API_KEY",
          description: "Referral Rock private API key used as the HTTP Basic password.",
        },
      ],
    },
  ],
  homepageUrl: "https://referralrock.com",
  actions: referralRockActions,
};
