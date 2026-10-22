import type { ProviderDefinition } from "../../core/types.ts";

import { snipeItActions } from "./actions.ts";

const service = "snipe_it";

export const provider: ProviderDefinition = {
  service,
  displayName: "Snipe-IT",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "snipe_it_api_key",
      description:
        "Snipe-IT API key sent as an Authorization Bearer token. Create or view API keys from your Snipe-IT user menu under Manage API keys.",
      extraFields: [
        {
          key: "instanceUrl",
          label: "Instance URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://assets.example.com",
          description: "Your public HTTPS Snipe-IT instance URL. URLs ending in /api/v1 are also accepted.",
        },
      ],
    },
  ],
  homepageUrl: "https://snipeitapp.com",
  actions: snipeItActions,
};
