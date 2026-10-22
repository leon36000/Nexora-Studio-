import type { ProviderDefinition } from "../../core/types.ts";

import { productlaneActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "productlane",
  displayName: "Productlane",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "V2 API Key",
      placeholder: "pl_v2_...",
      description:
        "Productlane v2 API key sent as a Bearer token. Create it under Settings > API: https://productlane.com/docs/integrations/api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://productlane.com",
  actions: productlaneActions,
};
