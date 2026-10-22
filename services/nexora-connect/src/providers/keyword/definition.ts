import type { ProviderDefinition } from "../../core/types.ts";

import { keywordActions } from "./actions.ts";

const service = "keyword";

/**
 * Keyword.com provider backed by the public Keyword.com API v2.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Keyword.com",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "KEYWORD_API_TOKEN",
      description:
        "Keyword.com API token sent with the Authorization Bearer header. Create an account and retrieve the token under Settings > Account: https://app.keyword.com/settings/account",
    },
  ],
  homepageUrl: "https://keyword.com",
  actions: keywordActions,
};
