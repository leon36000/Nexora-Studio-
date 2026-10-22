import type { ProviderDefinition } from "../../core/types.ts";

import { jinaAiActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "jina_ai",
  displayName: "Jina AI",
  categories: ["AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "JINA_API_KEY",
      description: "Jina AI API key sent as a Bearer token. Create one at https://jina.ai/api-dashboard/key-manager.",
    },
  ],
  homepageUrl: "https://jina.ai",
  actions: jinaAiActions,
};
