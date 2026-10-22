import type { ProviderDefinition } from "../../core/types.ts";

import { openrouterActions } from "./actions.ts";

const service = "openrouter";

export const provider: ProviderDefinition = {
  service,
  displayName: "OpenRouter",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "sk-or-v1-...",
      description:
        "OpenRouter API key used with the Authorization Bearer header. Get it from https://openrouter.ai/settings/keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://openrouter.ai",
  actions: openrouterActions,
};
