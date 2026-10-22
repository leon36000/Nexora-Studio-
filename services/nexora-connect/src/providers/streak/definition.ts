import type { ProviderDefinition } from "../../core/types.ts";

import { streakActions } from "./actions.ts";

const service = "streak";

export const provider: ProviderDefinition = {
  service,
  displayName: "Streak",
  categories: ["Productivity", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "streak_api_key",
      description:
        "Streak API key used as the HTTP Basic Auth username with an empty password. Create it from Gmail by opening the Streak sidebar and going to Integrations > Streak API.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.streak.com/",
  actions: streakActions,
};
