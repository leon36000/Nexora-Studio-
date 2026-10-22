import type { ProviderDefinition } from "../../core/types.ts";

import { sportsdataActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "sportsdata",
  displayName: "SportsDataIO",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SPORTSDATAIO_API_KEY",
      description:
        "SportsDataIO API key sent in the Ocp-Apim-Subscription-Key header. Get a trial, replay, or developer key at https://sportsdata.io/developers.",
    },
  ],
  homepageUrl: "https://sportsdata.io",
  actions: sportsdataActions,
};
