import type { ProviderDefinition } from "../../core/types.ts";

import { stabilityaiActions } from "./actions.ts";

const service = "stabilityai";

export const provider: ProviderDefinition = {
  service,
  displayName: "Stability AI",
  categories: ["AI", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "sk-...",
      description:
        "Stability AI API key used with the Authorization Bearer header. Create or copy it from https://platform.stability.ai/account/keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://stability.ai",
  actions: stabilityaiActions,
};
