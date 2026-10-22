import type { ProviderDefinition } from "../../core/types.ts";

import { buildkiteActions } from "./actions.ts";

const service = "buildkite";

export const provider: ProviderDefinition = {
  service,
  displayName: "Buildkite",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Access Token",
      placeholder: "bkua_...",
      description:
        "Buildkite API access token used with the Authorization Bearer header. Create it from Personal Settings > API Access Tokens at https://buildkite.com/user/api-access-tokens.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://buildkite.com",
  actions: buildkiteActions,
};
