import type { ProviderDefinition } from "../../core/types.ts";

import { svixActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "svix",
  displayName: "Svix",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Authentication Token",
      placeholder: "sk_...",
      description:
        "Svix authentication token used with the Authorization Bearer header. Find it on the API Access page of the Svix Dashboard.",
      extraFields: [
        {
          key: "serverUrl",
          label: "Server URL",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "https://api.us.svix.com",
          description:
            "Optional custom Svix API base URL for self-hosted or dedicated deployments. Leave empty to infer the official regional API host from the token suffix.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.svix.com",
  actions: svixActions,
};
