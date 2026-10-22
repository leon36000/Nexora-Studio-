import type { ProviderDefinition } from "../../core/types.ts";

import { processplanActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "processplan",
  displayName: "ProcessPlan",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "PROCESSPLAN_API_TOKEN",
      description:
        "ProcessPlan API token sent with the tkn_id header. Create a token from your ProcessPlan user profile: https://processplan.com/docs/api-documentation/authentication/.",
    },
  ],
  homepageUrl: "https://processplan.com",
  actions: processplanActions,
};
