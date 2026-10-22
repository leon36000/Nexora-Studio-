import type { ProviderDefinition } from "../../core/types.ts";

import { evervaultActions } from "./actions.ts";
export const provider: ProviderDefinition = {
  service: "evervault",
  displayName: "Evervault",
  categories: ["Developer Tools", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "api_key_...",
      description: "Evervault API key from App Settings > API Keys: https://app.evervault.com",
      extraFields: [
        {
          key: "appId",
          label: "App ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "app_...",
          description: "Evervault App ID from the Evervault dashboard.",
        },
      ],
    },
  ],
  homepageUrl: "https://evervault.com",
  actions: evervaultActions,
};
