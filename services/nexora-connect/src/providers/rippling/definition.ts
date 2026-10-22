import type { ProviderDefinition } from "../../core/types.ts";

import { ripplingActions } from "./actions.ts";

const service = "rippling";

export const provider: ProviderDefinition = {
  service,
  displayName: "Rippling",
  categories: ["Productivity", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "rippling_api_token",
      description:
        "Rippling API token sent as a Bearer token. Create an API token from the Rippling developer portal, then follow the REST API quickstart: https://developer.rippling.com/documentation/rest-api/essentials/quickstart.",
    },
  ],
  homepageUrl: "https://www.rippling.com/",
  actions: ripplingActions,
};
