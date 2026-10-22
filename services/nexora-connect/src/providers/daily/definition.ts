import type { ProviderDefinition } from "../../core/types.ts";

import { dailyActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "daily",
  displayName: "Daily",
  categories: ["Communication", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DAILY_API_KEY",
      description:
        "Daily API key sent with the Authorization Bearer header. Domain owners can view or regenerate it in the Developers section of the Daily dashboard: https://dashboard.daily.co/.",
    },
  ],
  homepageUrl: "https://www.daily.co/",
  actions: dailyActions,
};
