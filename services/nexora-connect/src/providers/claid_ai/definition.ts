import type { ProviderDefinition } from "../../core/types.ts";

import { claidAiActions } from "./actions.ts";

const service = "claid_ai";

export const provider: ProviderDefinition = {
  service,
  displayName: "Claid AI",
  categories: ["AI", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CLAID_API_KEY",
      description:
        "Claid API key used with the Authorization Bearer header. Create or manage it from the Claid API Keys page: https://claid.ai/account/api",
      extraFields: [],
    },
  ],
  homepageUrl: "https://claid.ai",
  actions: claidAiActions,
};
