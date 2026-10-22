import type { ProviderDefinition } from "../../core/types.ts";

import { rollbarActions } from "./actions.ts";

const service = "rollbar";

export const provider: ProviderDefinition = {
  service,
  displayName: "Rollbar",
  categories: ["Developer Tools", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Project Access Token",
      placeholder: "rollbar_project_access_token",
      description:
        "Rollbar project access token sent with the X-Rollbar-Access-Token header. Use a project token with read scope.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://rollbar.com",
  actions: rollbarActions,
};
