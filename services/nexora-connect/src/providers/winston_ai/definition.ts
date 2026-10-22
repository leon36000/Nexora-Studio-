import type { ProviderDefinition } from "../../core/types.ts";

import { winstonAiActions } from "./actions.ts";

const service = "winston_ai";

export const provider: ProviderDefinition = {
  service,
  displayName: "Winston AI",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "WINSTON_AI_API_KEY",
      description:
        "Winston AI API key used as a Bearer token in the Authorization header. Create or view API keys in the Winston AI developer dashboard at https://dev.gowinston.ai/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://gowinston.ai",
  actions: winstonAiActions,
};
