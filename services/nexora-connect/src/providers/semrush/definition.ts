import type { ProviderDefinition } from "../../core/types.ts";

import { semrushActions } from "./actions.ts";

const service = "semrush";

export const provider: ProviderDefinition = {
  service,
  displayName: "Semrush",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SEMRUSH_API_KEY",
      description:
        "Semrush API key passed as the key query parameter. Find it in Subscription info > API units: https://www.semrush.com/accounts/subscription-info/api-units/",
    },
  ],
  homepageUrl: "https://www.semrush.com/",
  actions: semrushActions,
};
