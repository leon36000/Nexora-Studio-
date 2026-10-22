import type { ProviderDefinition } from "../../core/types.ts";

import { callerapiActions } from "./actions.ts";

const service = "callerapi";

export const provider: ProviderDefinition = {
  service,
  displayName: "CallerAPI",
  categories: ["Communication", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CALLERAPI_API_KEY",
      description:
        "CallerAPI key sent with the x-auth header. Get it from the CallerAPI dashboard: https://callerapi.com/dashboard",
      extraFields: [],
    },
  ],
  homepageUrl: "https://callerapi.com",
  actions: callerapiActions,
};
