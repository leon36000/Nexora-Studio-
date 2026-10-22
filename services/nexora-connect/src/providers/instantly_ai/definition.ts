import type { ProviderDefinition } from "../../core/types.ts";

import { instantlyAiActions } from "./actions.ts";

const service = "instantly_ai";

/**
 * Instantly.ai provider backed by the public Instantly API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Instantly.ai",
  categories: ["Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "INSTANTLY_API_KEY",
      description:
        "Instantly API key sent as a Bearer token. Create or view API keys in Instantly settings: https://app.instantly.ai/app/settings/integrations.",
    },
  ],
  homepageUrl: "https://instantly.ai",
  actions: instantlyAiActions,
};
