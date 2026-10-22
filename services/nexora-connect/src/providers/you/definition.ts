import type { ProviderDefinition } from "../../core/types.ts";

import { youActions } from "./actions.ts";

const service = "you";

export const provider: ProviderDefinition = {
  service,
  displayName: "You.com",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOU_API_KEY",
      description:
        "You.com API key sent in the X-API-Key header. Create or manage keys on the You.com Platform API Keys page: https://you.com/platform/api-keys",
      extraFields: [],
    },
  ],
  homepageUrl: "https://you.com/",
  actions: youActions,
};
