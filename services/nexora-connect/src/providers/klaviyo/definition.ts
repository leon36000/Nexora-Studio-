import type { ProviderDefinition } from "../../core/types.ts";

import { klaviyoActions } from "./actions.ts";

const service = "klaviyo";

/**
 * Klaviyo provider backed by the public JSON:API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Klaviyo",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Private API Key",
      placeholder: "KLAVIYO_PRIVATE_API_KEY",
      description:
        "Klaviyo private API key sent in the Authorization: Klaviyo-API-Key header. Create one from Klaviyo Settings > Account > API keys: https://www.klaviyo.com/settings/account/api-keys",
    },
  ],
  homepageUrl: "https://www.klaviyo.com",
  actions: klaviyoActions,
};
