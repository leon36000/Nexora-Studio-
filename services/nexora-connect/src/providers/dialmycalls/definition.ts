import type { ProviderDefinition } from "../../core/types.ts";

import { dialMyCallsActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "dialmycalls",
  displayName: "DialMyCalls",
  categories: ["Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "dialmycalls_api_key",
      description:
        "DialMyCalls API key used as the HTTP Basic auth username. Find it under API Info: https://www.dialmycalls.com/api-documentation#request.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.dialmycalls.com",
  actions: dialMyCallsActions,
};
