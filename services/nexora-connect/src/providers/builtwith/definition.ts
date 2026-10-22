import type { ProviderDefinition } from "../../core/types.ts";

import { builtwithActions } from "./actions.ts";

const service = "builtwith";

export const provider: ProviderDefinition = {
  service,
  displayName: "BuiltWith",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "BUILTWITH_API_KEY",
      description:
        "BuiltWith API key sent with the KEY query parameter. Sign up or log in to view your API key: https://api.builtwith.com/domain-api",
      extraFields: [],
    },
  ],
  homepageUrl: "https://builtwith.com",
  actions: builtwithActions,
};
