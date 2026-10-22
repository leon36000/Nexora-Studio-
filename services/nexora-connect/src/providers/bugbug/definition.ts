import type { ProviderDefinition } from "../../core/types.ts";

import { bugbugActions } from "./actions.ts";

const service = "bugbug";

export const provider: ProviderDefinition = {
  service,
  displayName: "BugBug",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "bugbug_token",
      description:
        "BugBug API token used with the Authorization: Token <token> header. Find it in the Integrations tab of the BugBug web app: https://docs.bugbug.io/running-tests/running-via-api.",
    },
  ],
  homepageUrl: "https://bugbug.io",
  actions: bugbugActions,
};
