import type { ProviderDefinition } from "../../core/types.ts";

import { currentsApiActions } from "./actions.ts";

const service = "currents_api";

export const provider: ProviderDefinition = {
  service,
  displayName: "Currents API",
  categories: ["Data", "Social"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CURRENTS_API_KEY",
      description:
        "Currents API key sent with the Authorization header. Log in to view or generate it from the Currents dashboard: https://currentsapi.services/en/login/.",
    },
  ],
  homepageUrl: "https://currentsapi.services",
  actions: currentsApiActions,
};
