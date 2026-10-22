import type { ProviderDefinition } from "../../core/types.ts";

import { productboardActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "productboard",
  displayName: "Productboard",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "PRODUCTBOARD_API_TOKEN",
      description:
        "Productboard personal access token used as a Bearer token. Create it in Settings > Integrations > Public APIs > Access Token: https://developer.productboard.com/reference/api-token.",
    },
  ],
  homepageUrl: "https://www.productboard.com",
  actions: productboardActions,
};
