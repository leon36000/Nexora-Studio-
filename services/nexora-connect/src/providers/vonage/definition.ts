import type { ProviderDefinition } from "../../core/types.ts";

import { vonageActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "vonage",
  displayName: "Vonage",
  categories: ["Communication"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "apiKey",
          label: "API Key",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "VONAGE_API_KEY",
          description:
            "Vonage API key used as the HTTP Basic username. Find it under API Settings in the Vonage Dashboard: https://dashboard.vonage.com/settings",
        },
        {
          key: "apiSecret",
          label: "API Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "VONAGE_API_SECRET",
          description:
            "Vonage API secret used as the HTTP Basic password. View or rotate it under API Settings in the Vonage Dashboard: https://dashboard.vonage.com/settings",
        },
      ],
      testAction: { actionName: "get_balance", input: {} },
    },
  ],
  homepageUrl: "https://www.vonage.com/",
  actions: vonageActions,
};
