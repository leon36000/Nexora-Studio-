import type { ProviderDefinition } from "../../core/types.ts";

import { kieAiActions } from "./actions.ts";

const service = "kie_ai";

/**
 * KIE.AI provider backed by the public KIE.AI API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "KIE.AI",
  categories: ["AI", "Design & Media", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "KIE_AI_API_KEY",
      description:
        "KIE.AI API key sent as a Bearer token. Create and manage keys in the KIE.AI API key page: https://kie.ai/api-key",
    },
  ],
  homepageUrl: "https://kie.ai",
  actions: kieAiActions,
};
