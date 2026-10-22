import type { ProviderDefinition } from "../../core/types.ts";

import { timecampActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "timecamp",
  displayName: "TimeCamp",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "timecamp_api_token",
      description:
        "TimeCamp API token used with the Authorization: Bearer <token> header. Copy it from the TimeCamp user settings page: https://app.timecamp.com/app#/settings/users/me.",
    },
  ],
  homepageUrl: "https://www.timecamp.com",
  actions: timecampActions,
};
