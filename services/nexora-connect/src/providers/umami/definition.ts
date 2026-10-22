import type { ProviderDefinition } from "../../core/types.ts";

import { umamiActions } from "./actions.ts";

const service = "umami";

export const provider: ProviderDefinition = {
  service,
  displayName: "Umami",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "umami_api_key",
      description:
        "Umami Cloud API key used as an Authorization Bearer token. Create and manage API keys in Umami Cloud account settings: https://umami.is/docs/cloud/api-key.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://umami.is",
  actions: umamiActions,
};
