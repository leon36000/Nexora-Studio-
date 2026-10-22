import type { ProviderDefinition } from "../../core/types.ts";

import { parseurActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "parseur",
  displayName: "Parseur",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PARSEUR_API_KEY",
      description:
        "Parseur API key sent with the Authorization header. Create or view keys at https://app.parseur.com/account/api-keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://parseur.com",
  actions: parseurActions,
};
