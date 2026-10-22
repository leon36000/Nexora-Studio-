import type { ProviderDefinition } from "../../core/types.ts";

import { botStarActions } from "./actions.ts";

const service = "bot_star";

export const provider: ProviderDefinition = {
  service,
  displayName: "BotStar",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "BOTSTAR_API_TOKEN",
      description:
        "BotStar API token sent as a Bearer token. Copy it from the BotStar account profile page: https://app.botstar.com/account/profile.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://botstar.com",
  actions: botStarActions,
};
