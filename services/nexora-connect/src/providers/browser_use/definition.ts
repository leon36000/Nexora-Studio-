import type { ProviderDefinition } from "../../core/types.ts";

import { browserUseActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "browser_use",
  displayName: "Browser Use",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "bu_...",
      description:
        "Browser Use Cloud API key sent with the X-Browser-Use-API-Key header. Create one from https://cloud.browser-use.com/settings?tab=api-keys&new=1.",
    },
  ],
  homepageUrl: "https://browser-use.com",
  actions: browserUseActions,
};
