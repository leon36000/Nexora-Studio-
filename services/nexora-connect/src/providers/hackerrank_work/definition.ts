import type { ProviderDefinition } from "../../core/types.ts";

import { hackerrankWorkActions } from "./actions.ts";

const service = "hackerrank_work";

export const provider: ProviderDefinition = {
  service,
  displayName: "HackerRank Work",
  categories: ["Productivity", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "hackerrank_api_key",
      description:
        "HackerRank Work personal access token sent with the Authorization Bearer header. Create and manage tokens from the HackerRank API settings page: https://hackerrank.com/x/settings/api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.hackerrank.com/work",
  actions: hackerrankWorkActions,
};
