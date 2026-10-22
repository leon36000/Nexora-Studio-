import type { ProviderDefinition } from "../../core/types.ts";

import { circleciActions } from "./actions.ts";

const service = "circleci";

export const provider: ProviderDefinition = {
  service,
  displayName: "CircleCI",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal API Token",
      placeholder: "circleci_personal_token",
      description:
        "CircleCI personal API token used with the Circle-Token header. API v2 does not support project tokens. Create it from User Settings > Personal API Tokens in CircleCI: https://app.circleci.com/settings/user/tokens.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://circleci.com",
  actions: circleciActions,
};
