import type { ProviderDefinition } from "../../core/types.ts";

import { fairingActions } from "./actions.ts";

const service = "fairing";

export const provider: ProviderDefinition = {
  service,
  displayName: "Fairing",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "FAIRING_API_KEY",
      description:
        "Fairing API key sent in the Authorization header. Create or copy a Fairing API key from the dashboard integration settings documented by Fairing: https://docs.fairing.co/docs/google-sheets",
      extraFields: [],
    },
  ],
  homepageUrl: "https://fairing.co",
  actions: fairingActions,
};
