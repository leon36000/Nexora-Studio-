import type { ProviderDefinition } from "../../core/types.ts";

import { toriiActions } from "./actions.ts";

const service = "torii";

export const provider: ProviderDefinition = {
  service,
  displayName: "Torii",
  categories: ["Productivity", "Finance", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TORII_API_KEY",
      description:
        "Torii API key sent as a Bearer token in the Authorization header. Generate it in Torii Settings > API Access: https://app.toriihq.com/team/settings/apiAccess.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.toriihq.com",
  actions: toriiActions,
};
