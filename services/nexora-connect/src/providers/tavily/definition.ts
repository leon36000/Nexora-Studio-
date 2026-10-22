import type { ProviderDefinition } from "../../core/types.ts";

import { tavilyActions } from "./actions.ts";

const service = "tavily";

export const provider: ProviderDefinition = {
  service,
  displayName: "Tavily",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "tvly-...",
      description: "Tavily API key used with the Authorization: Bearer <apiKey> header.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://tavily.com",
  actions: tavilyActions,
};
