import type { ProviderDefinition } from "../../core/types.ts";

import { appcuesActions } from "./actions.ts";
export const provider: ProviderDefinition = {
  service: "appcues",
  displayName: "Appcues",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "APPCUES_API_KEY",
      description: "Appcues Public API key. Create it at https://studio.appcues.com/settings/keys",
      extraFields: [
        { key: "apiSecret", label: "API Secret", inputType: "password", required: true, secret: true },
        { key: "accountId", label: "Account ID", inputType: "text", required: true, secret: false },
        {
          key: "region",
          label: "Region",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "us",
          description: "Use us or eu.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.appcues.com",
  actions: appcuesActions,
};
