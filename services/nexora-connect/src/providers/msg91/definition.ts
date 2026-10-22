import type { ProviderDefinition } from "../../core/types.ts";

import { msg91Actions } from "./actions.ts";

const service = "msg91";

export const provider: ProviderDefinition = {
  service,
  displayName: "MSG91",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Authkey",
      placeholder: "MSG91_AUTHKEY",
      description:
        "MSG91 authkey used with the official SMS and OTP APIs. Sign in to the MSG91 control panel to view or create API keys: https://control.msg91.com/signin/.",
    },
  ],
  homepageUrl: "https://msg91.com",
  actions: msg91Actions,
};
