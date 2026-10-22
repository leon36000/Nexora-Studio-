import type { ProviderDefinition } from "../../core/types.ts";

import { closeActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "close",
  displayName: "Close",
  categories: ["Productivity", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "close_api_key",
      description:
        "Close API key used as the HTTP Basic Auth username with an empty password. Create it in Settings > Developer > API Keys: https://developer.close.com/api/overview/api-key-authentication.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.close.com",
  actions: closeActions,
};
