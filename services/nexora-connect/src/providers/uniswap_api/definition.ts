import type { ProviderDefinition } from "../../core/types.ts";

import { uniswapApiActions } from "./actions.ts";

const service = "uniswap_api";

export const provider: ProviderDefinition = {
  service,
  displayName: "Uniswap API",
  categories: ["Finance", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "UNISWAP_API_KEY",
      description:
        "Uniswap Trading API key sent with the x-api-key header. Create or manage it from the official Uniswap developer portal for the Trading API.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://uniswap.org",
  actions: uniswapApiActions,
};
