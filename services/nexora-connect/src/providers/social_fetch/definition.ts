import type { ProviderDefinition } from "../../core/types.ts";

import { socialFetchActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "social_fetch",
  displayName: "Social Fetch",
  description: "Retrieve Social Fetch account data and public profiles across supported social platforms.",
  categories: ["Social", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "sfk_...",
      description:
        "Social Fetch API key sent in the x-api-key header. Sign up and get your key at https://app.socialfetch.dev/playground.",
    },
  ],
  homepageUrl: "https://www.socialfetch.dev",
  actions: socialFetchActions,
};
