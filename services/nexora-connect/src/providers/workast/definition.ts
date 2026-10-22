import type { ProviderDefinition } from "../../core/types.ts";

import { workastActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "workast",
  displayName: "Workast",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "WORKAST_API_TOKEN",
      description:
        "Workast API token sent with the Authorization: Bearer header. Generate it from Preferences > API in the Workast web app: https://workast.freshdesk.com/support/solutions/articles/61000302705-how-to-generate-an-api-token.",
    },
  ],
  homepageUrl: "https://www.workast.com/",
  actions: workastActions,
};
