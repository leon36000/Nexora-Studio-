import type { ProviderDefinition } from "../../core/types.ts";

import { uptimerobotActions } from "./actions.ts";

const service = "uptimerobot";

export const provider: ProviderDefinition = {
  service,
  displayName: "UptimeRobot",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "uptimerobot_api_key",
      description:
        "UptimeRobot main or read-only API key sent in the legacy API request body. Create it from Integrations & API in your UptimeRobot dashboard.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://uptimerobot.com",
  actions: uptimerobotActions,
};
