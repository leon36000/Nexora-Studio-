import type { ProviderDefinition } from "../../core/types.ts";

import { braveSearchActions } from "./actions.ts";

const service = "brave_search";

export const provider: ProviderDefinition = {
  service,
  displayName: "Brave Search",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "BSAI...",
      description:
        "Brave Search API key sent with the X-Subscription-Token header. Create or view API keys in the Brave Search API dashboard: https://api.search.brave.com/app/keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://search.brave.com/",
  actions: braveSearchActions,
};
