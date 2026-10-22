import type { ProviderDefinition } from "../../core/types.ts";

import { mocoActions } from "./actions.ts";

const service = "moco";

export const provider: ProviderDefinition = {
  service,
  displayName: "MOCO",
  categories: ["Productivity", "Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MOCO_API_KEY",
      description:
        "MOCO API key sent with Token authentication. Find a user API key under your profile Integrations tab, or create an account API key in Settings > Extensions > API & Webhooks: https://everii-group.github.io/mocoapp-api-docs/authentication.html.",
      extraFields: [
        {
          key: "account",
          label: "Account",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "acme",
          description:
            "Your MOCO account subdomain from https://{account}.mocoapp.com. You can enter either the subdomain or the full MOCO account URL.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.mocoapp.com",
  actions: mocoActions,
};
