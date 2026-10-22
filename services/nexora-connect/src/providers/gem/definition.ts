import type { ProviderDefinition } from "../../core/types.ts";

import { gemActions } from "./actions.ts";

const service = "gem";

export const provider: ProviderDefinition = {
  service,
  displayName: "Gem",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "GEM_API_KEY",
      description:
        "Gem team API key sent with the X-API-Key header. Team admins can create API keys from Gem Team Settings: https://www.gem.com/admin.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.gem.com",
  actions: gemActions,
};
