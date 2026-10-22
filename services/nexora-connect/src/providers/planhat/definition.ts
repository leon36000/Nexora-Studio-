import type { ProviderDefinition } from "../../core/types.ts";

import { planhatActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "planhat",
  displayName: "Planhat",
  description: "Create, update, retrieve, and list Planhat companies and end users.",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Access Token",
      placeholder: "PLANHAT_API_ACCESS_TOKEN",
      description:
        "Planhat API Access Token sent with the Authorization Bearer header. Generate it from a Private App in Planhat settings: https://help.planhat.com/en/articles/9587349-how-to-set-up-private-apps-service-accounts-and-api-access-tokens-in-planhat",
    },
  ],
  homepageUrl: "https://www.planhat.com",
  actions: planhatActions,
};
