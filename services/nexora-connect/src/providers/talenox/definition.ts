import type { ProviderDefinition } from "../../core/types.ts";

import { talenoxActions } from "./actions.ts";

const service = "talenox";

export const provider: ProviderDefinition = {
  service,
  displayName: "Talenox",
  description: "Read Talenox company settings, branches, employees, working days, and working hours.",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "talenox_api_token",
      description:
        "Talenox API token sent as a Bearer token in the Authorization header. Obtain it in Talenox from the top-right navigation under API setting after signing in: https://app.talenox.com",
    },
  ],
  homepageUrl: "https://www.talenox.com/",
  actions: talenoxActions,
};
