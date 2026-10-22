import type { ProviderDefinition } from "../../core/types.ts";

import { teamcampActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "teamcamp",
  displayName: "Teamcamp",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TEAMCAMP_API_KEY",
      description:
        "Teamcamp API key sent with the apiKey header. Create or view it in Teamcamp Account Settings: https://dash.teamcamp.app/settings/apikey.",
    },
  ],
  homepageUrl: "https://www.teamcamp.app",
  actions: teamcampActions,
};
