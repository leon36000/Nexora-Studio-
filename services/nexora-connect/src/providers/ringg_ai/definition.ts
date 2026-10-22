import type { ProviderDefinition } from "../../core/types.ts";

import { ringgAiActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "ringg_ai",
  displayName: "Ringg AI",
  categories: ["AI", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Workspace API Key",
      placeholder: "YOUR_RINGG_AI_API_KEY",
      description: "Ringg AI workspace API key. Copy it from https://www.ringg.ai/dashboard/api",
    },
  ],
  homepageUrl: "https://www.ringg.ai",
  actions: ringgAiActions,
};
