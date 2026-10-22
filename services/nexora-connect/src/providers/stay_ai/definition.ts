import type { ProviderDefinition } from "../../core/types.ts";

import { stayAiActions } from "./actions.ts";

const service = "stay_ai";

export const provider: ProviderDefinition = {
  service,
  displayName: "Stay AI",
  categories: ["Marketing", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "stay_ai_api_key",
      description:
        "Stay AI API key sent with the X-RETEXTION-ACCESS-TOKEN header. Use the API key described in the Stay AI Open API authentication guide: https://docs.stay.ai/recipes/authenticate-open-api",
    },
  ],
  homepageUrl: "https://stay.ai",
  actions: stayAiActions,
};
