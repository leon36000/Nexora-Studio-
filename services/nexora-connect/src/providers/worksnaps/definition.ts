import type { ProviderDefinition } from "../../core/types.ts";

import { worksnapsActions } from "./actions.ts";

const service = "worksnaps";

export const provider: ProviderDefinition = {
  service,
  displayName: "Worksnaps",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "WORKSNAPS_API_TOKEN",
      description:
        "Worksnaps API token used with HTTP Basic auth as the username while the password is ignored. Find or regenerate it in Profile & Settings > Web Service API: https://api.worksnaps.com/api_docs/api_token.html",
    },
  ],
  homepageUrl: "https://www.worksnaps.com",
  actions: worksnapsActions,
};
