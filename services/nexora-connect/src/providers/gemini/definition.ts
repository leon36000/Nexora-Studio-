import type { ProviderDefinition } from "../../core/types.ts";

import { geminiActions } from "./actions.ts";

const service = "gemini";

/**
 * Google Gemini API provider.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Gemini",
  categories: ["AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "GEMINI_API_KEY",
      description:
        "Gemini API key sent with the x-goog-api-key header. Get it from https://aistudio.google.com/api-keys.",
    },
  ],
  homepageUrl: "https://ai.google.dev/gemini-api",
  actions: geminiActions,
};
