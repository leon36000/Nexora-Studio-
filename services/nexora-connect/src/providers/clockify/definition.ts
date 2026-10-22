import type { ProviderDefinition } from "../../core/types.ts";

import { clockifyActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "clockify",
  displayName: "Clockify",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "clockify_api_key",
      description:
        "Clockify API key used with the X-Api-Key header. Generate it in Preferences > Advanced > API Key: https://clockify.me/help/troubleshooting/api-key-and-authentication/where-to-generate-api-key-for-account.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://clockify.me",
  actions: clockifyActions,
};
