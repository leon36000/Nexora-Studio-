import type { ProviderDefinition } from "../../core/types.ts";

import { raiselyActions } from "./actions.ts";

const service = "raisely";

export const provider: ProviderDefinition = {
  service,
  displayName: "Raisely",
  categories: ["Finance", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Campaign Secret Key",
      placeholder: "raisely-sk-...",
      description:
        "Raisely campaign secret key used as a Bearer token. Create or view it in Raisely admin, and see the official developer portal at https://raisely.com/developers.",
    },
  ],
  homepageUrl: "https://raisely.com/",
  actions: raiselyActions,
};
