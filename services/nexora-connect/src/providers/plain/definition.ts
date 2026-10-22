import type { ProviderDefinition } from "../../core/types.ts";

import { plainActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "plain",
  displayName: "Plain",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "plainApiKey_xxx",
      description:
        "Plain machine-user API key sent as a Bearer token. Create it in Settings > Machine Users > Add API Key, or see https://www.plain.com/docs/graphql/authentication.",
    },
  ],
  homepageUrl: "https://www.plain.com",
  actions: plainActions,
};
