import type { ProviderDefinition } from "../../core/types.ts";

import { marketstackActions } from "./actions.ts";

const service = "marketstack";

/**
 * Marketstack provider backed by the Marketstack V2 REST API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Marketstack",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "marketstack_api_key",
      description:
        "Marketstack V2 API key sent with the access_key query parameter. Find or reset it in https://marketstack.com/dashboard.",
    },
  ],
  homepageUrl: "https://marketstack.com",
  actions: marketstackActions,
};
