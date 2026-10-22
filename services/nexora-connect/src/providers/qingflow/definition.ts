import type { ProviderDefinition } from "../../core/types.ts";

import { qingflowActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "qingflow",
  displayName: "Qingflow",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Super-admin Access Token",
      placeholder: "QINGFLOW_ACCESS_TOKEN",
      description:
        "Qingflow OPEN API super-admin access token. Sign in at https://qingflow.com/passport/login, then open Qing Marketplace > Extensions > Third-party Connections > OPEN API > Configuration to copy the token.",
    },
  ],
  homepageUrl: "https://qingflow.com/",
  actions: qingflowActions,
};
