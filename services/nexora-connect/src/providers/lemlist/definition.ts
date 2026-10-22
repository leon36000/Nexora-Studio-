import type { ProviderDefinition } from "../../core/types.ts";

import { lemlistActions } from "./actions.ts";

const service = "lemlist";

/**
 * lemlist provider backed by the public lemlist API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "lemlist",
  categories: ["Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "LEMLIST_API_KEY",
      description:
        "lemlist API key used as the HTTP Basic Auth password with an empty username. Generate it from lemlist Settings > Integrations: https://app.lemlist.com/settings/integrations",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.lemlist.com",
  actions: lemlistActions,
};
