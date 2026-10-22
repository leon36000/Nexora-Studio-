import type { ProviderDefinition } from "../../core/types.ts";

import { ipstackActions } from "./actions.ts";

const service = "ipstack";

/**
 * ipstack provider backed by the public geolocation lookup API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "ipstack",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "IPSTACK_API_KEY",
      description:
        "ipstack API key sent as the access_key query parameter. Find it in your APILayer account API keys page: https://apilayer.com/docs/article/managing-api-keys",
    },
  ],
  homepageUrl: "https://ipstack.com",
  actions: ipstackActions,
};
