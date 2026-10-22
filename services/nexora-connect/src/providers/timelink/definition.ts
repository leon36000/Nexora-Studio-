import type { ProviderDefinition } from "../../core/types.ts";

import { timelinkActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "timelink",
  displayName: "timelink",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "TIMELINK_API_TOKEN",
      description:
        "Timelink API token sent with the Authorization Bearer header. Create it in Mein Konto > API-Tokens: https://docs.timelink.io/api",
    },
  ],
  homepageUrl: "https://timelink.io",
  actions: timelinkActions,
};
