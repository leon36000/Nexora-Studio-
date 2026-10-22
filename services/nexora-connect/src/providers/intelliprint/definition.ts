import type { ProviderDefinition } from "../../core/types.ts";

import { intelliprintActions } from "./actions.ts";

const service = "intelliprint";

/**
 * Intelliprint provider backed by the public Intelliprint API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Intelliprint",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "INTELLIPRINT_API_KEY",
      description:
        "Intelliprint API key sent with the Authorization header. Create or manage API keys in the Intelliprint account API keys page: https://account.intelliprint.net/api_keys.",
    },
  ],
  homepageUrl: "https://www.intelliprint.net",
  actions: intelliprintActions,
};
