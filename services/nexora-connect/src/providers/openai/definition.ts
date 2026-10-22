import type { ProviderDefinition } from "../../core/types.ts";

import { openaiActions } from "./actions.ts";

const service = "openai";

/**
 * OpenAI provider backed by OpenAI API keys.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "OpenAI",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "sk-proj-...",
      description:
        "OpenAI API key used with the Authorization Bearer header. Create or manage it on the API Keys page: https://platform.openai.com/api-keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://openai.com/api/",
  actions: openaiActions,
};
