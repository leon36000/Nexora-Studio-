import type { ProviderDefinition } from "../../core/types.ts";

import { urlscanActions } from "./actions.ts";

const service = "urlscan";

export const provider: ProviderDefinition = {
  service,
  displayName: "urlscan.io",
  categories: ["Security", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "URLSCAN_API_KEY",
      description:
        "urlscan.io API key sent with the API-Key header. Create an account and manage API keys from the user area.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://urlscan.io",
  actions: urlscanActions,
};
