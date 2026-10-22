import type { ProviderDefinition } from "../../core/types.ts";

import { samcartActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "samcart",
  displayName: "SamCart",
  categories: ["Marketing", "Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "SAMCART_API_TOKEN",
      description:
        "SamCart API token sent with the sc-api header. API access is granted by SamCart Support: https://help.samcart.com/support/solutions/articles/60000805533-samcart-api.",
    },
  ],
  homepageUrl: "https://www.samcart.com",
  actions: samcartActions,
};
