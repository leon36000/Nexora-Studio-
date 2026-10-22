import type { ProviderDefinition } from "../../core/types.ts";

import { shortMenuActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "short_menu",
  displayName: "Short Menu",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SHORT_MENU_API_KEY",
      description:
        "Short Menu API key sent with the x-api-key header. Create it in the official API Keys settings page: https://app.shortmenu.com/settings/api-keys.",
    },
  ],
  homepageUrl: "https://shortmenu.com",
  actions: shortMenuActions,
};
