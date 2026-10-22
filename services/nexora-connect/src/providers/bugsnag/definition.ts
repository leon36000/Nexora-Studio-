import type { ProviderDefinition } from "../../core/types.ts";

import { bugsnagActions } from "./actions.ts";

const service = "bugsnag";

export const provider: ProviderDefinition = {
  service,
  displayName: "Bugsnag",
  categories: ["Developer Tools", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Auth Token",
      placeholder: "BUGSNAG_PERSONAL_AUTH_TOKEN",
      description:
        "Bugsnag personal auth token sent with the Authorization header using the token prefix. Find it on your Bugsnag project overview page after signing in: https://app.bugsnag.com/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.bugsnag.com",
  actions: bugsnagActions,
};
