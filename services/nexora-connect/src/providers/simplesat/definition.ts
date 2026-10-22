import type { ProviderDefinition } from "../../core/types.ts";

import { simplesatActions } from "./actions.ts";

const service = "simplesat";

export const provider: ProviderDefinition = {
  service,
  displayName: "Simplesat",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SIMPLESAT_API_KEY",
      description:
        "Simplesat API key sent with the X-Simplesat-Token header. Create and manage API keys from the Simplesat API keys page: https://app.simplesat.io/settings/api-keys/.",
    },
  ],
  homepageUrl: "https://www.simplesat.io/",
  actions: simplesatActions,
};
