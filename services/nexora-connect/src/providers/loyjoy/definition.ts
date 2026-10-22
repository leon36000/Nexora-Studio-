import type { ProviderDefinition } from "../../core/types.ts";

import { loyjoyActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "loyjoy",
  displayName: "LoyJoy",
  categories: ["AI", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "LOYJOY_ACCESS_TOKEN",
      description:
        "Tenant-scoped LoyJoy access token. Create one in LoyJoy Manager under Tenant Settings > API: https://cloud.loyjoy.com/.",
    },
  ],
  homepageUrl: "https://www.loyjoy.com/en/",
  actions: loyjoyActions,
};
