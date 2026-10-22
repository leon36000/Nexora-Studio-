import type { ProviderDefinition } from "../../core/types.ts";

import { callpageActions } from "./actions.ts";

const service = "callpage";

export const provider: ProviderDefinition = {
  service,
  displayName: "CallPage",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "CALLPAGE_API_TOKEN",
      description:
        "CallPage API token sent with the Authorization header. Generate or view it in the CallPage dashboard API settings: https://core.callpage.io/settings/api",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.callpage.io",
  actions: callpageActions,
};
