import type { ProviderDefinition } from "../../core/types.ts";

import { context7Actions } from "./actions.ts";

const service = "context7";

export const provider: ProviderDefinition = {
  service,
  displayName: "Context7",
  description: "Search and retrieve up-to-date library documentation context for coding agents.",
  categories: ["Developer Tools", "AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ctx7sk-...",
      description:
        "Context7 API key sent as a Bearer token. Create and manage keys in the Context7 dashboard: https://context7.com/dashboard.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://context7.com",
  actions: context7Actions,
};
