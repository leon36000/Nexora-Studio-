import type { ProviderDefinition } from "../../core/types.ts";

import { harmonicAiActions } from "./actions.ts";

const service = "harmonic_ai";

export const provider: ProviderDefinition = {
  service,
  displayName: "Harmonic.ai",
  categories: ["Data", "AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "HARMONIC_API_KEY",
      description:
        "Harmonic team API key sent with the apikey header. Create or manage API keys from the Harmonic console API settings: https://console.harmonic.ai/settings/api-keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://harmonic.ai",
  actions: harmonicAiActions,
};
