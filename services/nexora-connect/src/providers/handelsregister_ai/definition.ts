import type { ProviderDefinition } from "../../core/types.ts";

import { handelsregisterAiActions } from "./actions.ts";
export const provider: ProviderDefinition = {
  service: "handelsregister_ai",
  displayName: "Handelsregister AI",
  categories: ["Data", "Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_API_KEY",
      description: "Handelsregister AI API key from the official dashboard: https://handelsregister.ai/en/dashboard.",
    },
  ],
  homepageUrl: "https://handelsregister.ai",
  actions: handelsregisterAiActions,
};
