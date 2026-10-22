import type { ProviderDefinition } from "../../core/types.ts";

import { pinboardActions } from "./actions.ts";

const service = "pinboard";

export const provider: ProviderDefinition = {
  service,
  displayName: "Pinboard",
  description: "Read, create, delete, and organize bookmarks in Pinboard.",
  categories: ["Productivity", "Social"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "username:TOKEN",
      description:
        "Pinboard API token in username:TOKEN form, sent as the auth_token query parameter. Find it on the Pinboard password settings page: https://pinboard.in/settings/password",
    },
  ],
  homepageUrl: "https://pinboard.in/",
  actions: pinboardActions,
};
