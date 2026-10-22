import type { ProviderDefinition } from "../../core/types.ts";

import { oncehubActions } from "./actions.ts";

const service = "oncehub";

export const provider: ProviderDefinition = {
  service,
  displayName: "OnceHub",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ONCEHUB_API_KEY",
      description:
        "OnceHub API key sent with the API-Key request header. Create one from Account Integrations > APIs & Webhooks in OnceHub: https://developers.oncehub.com/docs/overview/authentication",
    },
  ],
  homepageUrl: "https://www.oncehub.com",
  actions: oncehubActions,
};
