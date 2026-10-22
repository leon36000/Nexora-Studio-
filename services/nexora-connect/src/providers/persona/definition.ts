import type { ProviderDefinition } from "../../core/types.ts";

import { personaActions } from "./actions.ts";

const service = "persona";

export const provider: ProviderDefinition = {
  service,
  displayName: "Persona",
  categories: ["Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "persona_api_key",
      description:
        "Persona API key used with the Authorization Bearer header. Create or view API keys in the Persona dashboard: https://app.withpersona.com/dashboard/api-keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://withpersona.com/",
  actions: personaActions,
};
