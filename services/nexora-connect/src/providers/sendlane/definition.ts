import type { ProviderDefinition } from "../../core/types.ts";

import { sendlaneActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "sendlane",
  displayName: "Sendlane",
  categories: ["Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "sendlane_api_token",
      description: "Sendlane API V2 token. Create one under Account > API > Sendlane API V2 and paste it here.",
    },
  ],
  homepageUrl: "https://www.sendlane.com/",
  actions: sendlaneActions,
};
