import type { ProviderDefinition } from "../../core/types.ts";

import { callinglyActions } from "./actions.ts";

const service = "callingly";

export const provider: ProviderDefinition = {
  service,
  displayName: "Callingly",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Bearer Token",
      placeholder: "CALLINGLY_BEARER_TOKEN",
      description:
        "Callingly bearer token used with the Authorization header. Create it under Settings > API Keys in the Callingly dashboard: https://callingly.com/dashboard/settings/api_keys",
      extraFields: [],
    },
  ],
  homepageUrl: "https://callingly.com",
  actions: callinglyActions,
};
