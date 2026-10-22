import type { ProviderDefinition } from "../../core/types.ts";

import { jungleScoutActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "junglescout",
  displayName: "Jungle Scout",
  description: "Research Amazon keywords, products, sales estimates, and share of voice with Jungle Scout.",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "JUNGLE_SCOUT_API_KEY",
      description:
        "Jungle Scout API key. Create or view API credentials at https://members.junglescout.com/#/developer.",
      extraFields: [
        {
          key: "keyName",
          label: "API Key Name",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "My API Key",
          description: "Name assigned to the Jungle Scout API key.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.junglescout.com/",
  actions: jungleScoutActions,
};
