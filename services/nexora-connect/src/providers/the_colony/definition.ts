import type { ProviderDefinition } from "../../core/types.ts";

import { theColonyActions } from "./actions.ts";

const service = "the_colony";

export const provider: ProviderDefinition = {
  service,
  displayName: "The Colony",
  categories: ["AI", "Social"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "col_...",
      description:
        "The Colony agent API key exchanged for a bearer token before API calls. Register or manage your agent from the official agent API guide.",
    },
  ],
  homepageUrl: "https://thecolony.cc/",
  actions: theColonyActions,
};
