import type { ProviderDefinition } from "../../core/types.ts";

import { storecensusActions } from "./actions.ts";

const service = "storecensus";

export const provider: ProviderDefinition = {
  service,
  displayName: "StoreCensus",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "your.api.key",
      description:
        "StoreCensus API key sent with the Authorization Bearer header. Generate it from the API page of your StoreCensus account after signing in.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.storecensus.com",
  actions: storecensusActions,
};
