import type { ProviderDefinition } from "../../core/types.ts";

import { pylonActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "pylon",
  displayName: "Pylon",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "pylon_api_token",
      description:
        "Pylon API token sent as a Bearer token. Generate it in the Pylon dashboard under Settings > API tokens: https://app.usepylon.com/settings/api-tokens.",
    },
  ],
  homepageUrl: "https://www.usepylon.com",
  actions: pylonActions,
};
