import type { ProviderDefinition } from "../../core/types.ts";

import { printifyActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "printify",
  displayName: "Printify",
  categories: ["Productivity", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "printify_personal_access_token",
      description:
        "Printify Personal Access Token sent as a Bearer token. Create one in My Profile > Connections: https://printify.com/app/account/connections.",
    },
  ],
  homepageUrl: "https://printify.com/",
  actions: printifyActions,
};
