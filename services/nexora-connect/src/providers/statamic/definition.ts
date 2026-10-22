import type { ProviderDefinition } from "../../core/types.ts";

import { statamicActions } from "./actions.ts";

const service = "statamic";

export const provider: ProviderDefinition = {
  service,
  displayName: "Statamic",
  categories: ["Developer Tools", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "STATAMIC_API_TOKEN",
      description:
        "Statamic API token used as a Bearer token for the statamic.com Sites API. Create a token in your statamic.com account.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://statamic.com",
  actions: statamicActions,
};
