import type { ProviderDefinition } from "../../core/types.ts";

import { linklyActions } from "./actions.ts";

const service = "linkly";

export const provider: ProviderDefinition = {
  service,
  displayName: "Linkly",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "LINKLY_API_KEY",
      description:
        "Linkly API key used as a Bearer token. Generate or manage API keys under Settings > API Keys in Linkly, or see https://linklyhq.com/url-shortener-api-reference.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://linklyhq.com",
  actions: linklyActions,
};
