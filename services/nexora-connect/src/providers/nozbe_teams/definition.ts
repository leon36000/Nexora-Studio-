import type { ProviderDefinition } from "../../core/types.ts";

import { nozbeTeamsActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "nozbe_teams",
  displayName: "Nozbe",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "NOZBE_API_TOKEN",
      description:
        "Nozbe API token sent with the Authorization header. Generate one under Settings > API tokens in Nozbe: https://nozbe.help/advancedfeatures/api/",
    },
  ],
  homepageUrl: "https://nozbe.com",
  actions: nozbeTeamsActions,
};
