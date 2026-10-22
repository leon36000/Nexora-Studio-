import type { ProviderDefinition } from "../../core/types.ts";

import { attentionActions } from "./actions.ts";

const service = "attention";

export const provider: ProviderDefinition = {
  service,
  displayName: "Attention",
  categories: ["AI", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ATTENTION_API_KEY",
      description:
        "Attention API key sent as a Bearer token. Admins can create and manage keys from the Attention API Keys settings page: https://app.attention.tech.",
    },
  ],
  homepageUrl: "https://attention.com",
  actions: attentionActions,
};
