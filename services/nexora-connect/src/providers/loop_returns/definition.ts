import type { ProviderDefinition } from "../../core/types.ts";

import { loopReturnsActions } from "./actions.ts";

const service = "loop_returns";

export const provider: ProviderDefinition = {
  service,
  displayName: "Loop Returns",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "LOOP_RETURNS_API_KEY",
      description:
        "Loop Returns API key sent in the X-Authorization header. Generate it in Loop Admin under Returns Management > Tools & integrations > Developer Tools: https://admin.loopreturns.com/settings/developers.",
    },
  ],
  homepageUrl: "https://www.loopreturns.com",
  actions: loopReturnsActions,
};
