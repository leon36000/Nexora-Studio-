import type { ProviderDefinition } from "../../core/types.ts";

import { altTextGeneratorAiActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "alt_text_generator_ai",
  displayName: "Alt Text Generator AI",
  categories: ["AI", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_API_KEY",
      description:
        "Alt Text Generator AI key sent as the wpkey JSON field. Copy it from your dashboard: https://alttextgeneratorai.com/dashboard",
    },
  ],
  homepageUrl: "https://alttextgeneratorai.com",
  actions: altTextGeneratorAiActions,
};
