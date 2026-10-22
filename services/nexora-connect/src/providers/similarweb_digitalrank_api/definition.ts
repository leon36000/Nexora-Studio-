import type { ProviderDefinition } from "../../core/types.ts";

import { similarwebDigitalRankApiActions } from "./actions.ts";

const service = "similarweb_digitalrank_api";

export const provider: ProviderDefinition = {
  service,
  displayName: "Similarweb",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SIMILARWEB_API_KEY",
      description:
        "Similarweb API key sent with the api_key query parameter. Generate it in Settings > Account > API: https://developers.similarweb.com/docs/get-api-key",
    },
  ],
  homepageUrl: "https://www.similarweb.com",
  actions: similarwebDigitalRankApiActions,
};
