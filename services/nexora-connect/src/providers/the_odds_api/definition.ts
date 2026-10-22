import type { ProviderDefinition } from "../../core/types.ts";

import { theOddsApiActions } from "./actions.ts";

const service = "the_odds_api";

export const provider: ProviderDefinition = {
  service,
  displayName: "The Odds API",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "the_odds_api_key",
      description: "The Odds API key sent as the apiKey query parameter.",
    },
  ],
  homepageUrl: "https://the-odds-api.com",
  actions: theOddsApiActions,
};
