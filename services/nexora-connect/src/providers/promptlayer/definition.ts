import type { ProviderDefinition } from "../../core/types.ts";

import { promptLayerActions } from "./actions.ts";

const service = "promptlayer";

export const provider: ProviderDefinition = {
  service,
  displayName: "PromptLayer",
  description: "Retrieve PromptLayer request logs, prompt templates, Tables, sheets, and rows.",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PROMPTLAYER_API_KEY",
      description:
        "PromptLayer API key sent in the X-API-KEY header. Generate API keys from the API keys page in your PromptLayer dashboard: https://dashboard.promptlayer.com/.",
    },
  ],
  homepageUrl: "https://promptlayer.com/",
  actions: promptLayerActions,
};
