import type { ProviderDefinition } from "../../core/types.ts";

import { groqcloudActions } from "./actions.ts";

/**
 * GroqCloud provider backed by the Groq OpenAI-compatible API.
 */
export const provider: ProviderDefinition = {
  service: "groqcloud",
  displayName: "GroqCloud",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "gsk_...",
      description:
        "GroqCloud API key used with the Authorization Bearer header. Get it from https://console.groq.com/keys.",
    },
  ],
  homepageUrl: "https://groq.com",
  actions: groqcloudActions,
};
