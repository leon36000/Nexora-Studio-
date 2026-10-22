import type { ProviderDefinition } from "../../core/types.ts";

import { cronitorActions } from "./actions.ts";

const service = "cronitor";

export const provider: ProviderDefinition = {
  service,
  displayName: "Cronitor",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CRONITOR_API_KEY",
      description:
        "Cronitor API key used as the HTTP Basic auth username. Create or view keys from the API Settings page in your Cronitor dashboard: https://cronitor.io/app/settings/api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://cronitor.io",
  actions: cronitorActions,
};
