import type { ProviderDefinition } from "../../core/types.ts";

import { nasdaqActions } from "./actions.ts";

const service = "nasdaq";

/**
 * Nasdaq Data Link provider backed by the public Data Link API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Nasdaq Data Link",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "Your Nasdaq Data Link API key",
      description:
        "Nasdaq Data Link API key sent with the api_key query parameter and X-Api-Token header. Find it in your Account Settings: https://help.data.nasdaq.com/article/937-where-can-i-find-my-api-key.",
    },
  ],
  homepageUrl: "https://data.nasdaq.com",
  actions: nasdaqActions,
};
