import type { ProviderDefinition } from "../../core/types.ts";

import { openPageRankActions } from "./actions.ts";

const service = "openpagerank";

export const provider: ProviderDefinition = {
  service,
  displayName: "OpenPageRank",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "OPENPAGERANK_API_KEY",
      description:
        "OpenPageRank API key sent with the API-OPR header. Get free API access from the OpenPageRank signup page: https://www.domcop.com/openpagerank/auth/signup.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://openpagerank.com",
  actions: openPageRankActions,
};
