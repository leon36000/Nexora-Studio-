import type { ProviderDefinition } from "../../core/types.ts";

import { tapfiliateActions } from "./actions.ts";

const service = "tapfiliate";

export const provider: ProviderDefinition = {
  service,
  displayName: "Tapfiliate",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TAPFILIATE_API_KEY",
      description:
        "Tapfiliate API key sent in the X-Api-Key header. Find and manage it in Tapfiliate account settings: https://support.tapfiliate.com/en/articles/1441950-your-api-key.",
    },
  ],
  homepageUrl: "https://tapfiliate.com/",
  actions: tapfiliateActions,
};
