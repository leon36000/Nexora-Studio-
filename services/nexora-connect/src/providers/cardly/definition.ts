import type { ProviderDefinition } from "../../core/types.ts";

import { cardlyActions } from "./actions.ts";

const service = "cardly";

export const provider: ProviderDefinition = {
  service,
  displayName: "Cardly",
  categories: ["Marketing", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CARDLY_API_KEY",
      description:
        "Cardly API key sent with the API-Key header. Cardly provides test and live API keys when API access is set up: https://api.card.ly/openapi/en-AU/2.2.0.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.card.ly",
  actions: cardlyActions,
};
