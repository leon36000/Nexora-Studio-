import type { ProviderDefinition } from "../../core/types.ts";

import { crunchbaseActions } from "./actions.ts";

const service = "crunchbase";

export const provider: ProviderDefinition = {
  service,
  displayName: "Crunchbase",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CRUNCHBASE_API_KEY",
      description:
        "Crunchbase API key sent with the X-cb-user-key header. API keys are emailed after Crunchbase Data registration; contact api@crunchbase.com if you lose yours: https://data.crunchbase.com/docs/using-the-api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.crunchbase.com",
  actions: crunchbaseActions,
};
