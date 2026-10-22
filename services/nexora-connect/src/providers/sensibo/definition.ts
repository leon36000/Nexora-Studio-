import type { ProviderDefinition } from "../../core/types.ts";

import { sensiboActions } from "./actions.ts";

const service = "sensibo";

export const provider: ProviderDefinition = {
  service,
  displayName: "Sensibo",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SENSIBO_API_KEY",
      description:
        "Sensibo API key sent with the apiKey query parameter. Generate or rotate it in account settings: https://home.sensibo.com/me/api",
    },
  ],
  homepageUrl: "https://home.sensibo.com",
  actions: sensiboActions,
};
