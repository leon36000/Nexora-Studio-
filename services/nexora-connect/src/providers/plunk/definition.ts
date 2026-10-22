import type { ProviderDefinition } from "../../core/types.ts";

import { plunkActions } from "./actions.ts";

const service = "plunk";

export const provider: ProviderDefinition = {
  service,
  displayName: "Plunk",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "sk_...",
      description:
        "Plunk API key used with the Authorization Bearer header. Find it in your Plunk project under Settings > API Keys: https://docs.useplunk.com/guides/api-keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.useplunk.com",
  actions: plunkActions,
};
