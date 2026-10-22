import type { ProviderDefinition } from "../../core/types.ts";

import { dailybotActions } from "./actions.ts";

const service = "dailybot";

export const provider: ProviderDefinition = {
  service,
  displayName: "Dailybot",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "dailybot_api_key",
      description:
        "Dailybot API key sent with the X-API-KEY header. Create or revoke it in the Dailybot integrations dashboard.",
    },
  ],
  homepageUrl: "https://www.dailybot.com",
  actions: dailybotActions,
};
