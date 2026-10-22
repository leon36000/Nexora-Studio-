import type { ProviderDefinition } from "../../core/types.ts";

import { shortcutActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "shortcut",
  displayName: "Shortcut",
  categories: ["Productivity", "Project Management"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "shortcut_api_token",
      description:
        "Shortcut API token sent with the Shortcut-Token header. Create it in Shortcut under Settings > API Tokens, then confirm the auth contract in the official REST API guide: https://developer.shortcut.com/api/rest/v3#Authentication.",
    },
  ],
  homepageUrl: "https://www.shortcut.com",
  actions: shortcutActions,
};
