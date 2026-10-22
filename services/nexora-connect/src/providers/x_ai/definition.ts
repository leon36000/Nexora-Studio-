import type { ProviderDefinition } from "../../core/types.ts";

import { xAiActions } from "./actions.ts";

const service = "x_ai";

export const provider: ProviderDefinition = {
  service,
  displayName: "xAI",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      description:
        "xAI API key used with the Authorization Bearer header. Create or manage keys in the xAI Console at https://console.x.ai.",
    },
  ],
  homepageUrl: "https://x.ai",
  actions: xAiActions,
};
