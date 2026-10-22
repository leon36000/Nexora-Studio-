import type { ProviderDefinition } from "../../core/types.ts";

import { dopplerMarketingAutomationActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "doppler_marketing_automation",
  displayName: "Doppler Marketing Automation",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DOPPLER_MARKETING_API_KEY",
      description:
        "Doppler Email Marketing API key. Find it under Control Panel > Advanced Preferences > Doppler API: https://help.fromdoppler.com/en/where-do-i-find-my-api-key/.",
      extraFields: [
        {
          key: "accountEmail",
          label: "Account Email",
          required: true,
          secret: false,
          inputType: "text",
          placeholder: "user@example.com",
          description: "Email address of the Doppler account that owns the API key.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.fromdoppler.com/en/",
  actions: dopplerMarketingAutomationActions,
};
