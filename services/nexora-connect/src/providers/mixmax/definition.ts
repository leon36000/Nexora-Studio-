import type { ProviderDefinition } from "../../core/types.ts";

import { mixmaxActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "mixmax",
  displayName: "Mixmax",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "MIXMAX_API_TOKEN",
      description:
        "Mixmax developer token sent with the X-API-Token header. Create it in My Settings > Integrations > API: https://success.mixmax.com/en/articles/11643056-mixmax-rest-api",
    },
  ],
  homepageUrl: "https://www.mixmax.com/",
  actions: mixmaxActions,
};
