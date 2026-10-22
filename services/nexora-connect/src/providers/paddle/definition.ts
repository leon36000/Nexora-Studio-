import type { ProviderDefinition } from "../../core/types.ts";

import { paddleActions } from "./actions.ts";

const service = "paddle";

/**
 * Paddle provider backed by Paddle API keys.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Paddle",
  categories: ["Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "pdl_live_apikey_...",
      description:
        "Paddle API key sent as a Bearer token. Create or copy it from Paddle > Developer Tools > Authentication: https://developer.paddle.com/api-reference/about/authentication.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.paddle.com",
  actions: paddleActions,
};
