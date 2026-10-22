import type { ProviderDefinition } from "../../core/types.ts";

import { processStreetActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "process_street",
  displayName: "Process Street",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PROCESS_STREET_API_KEY",
      description:
        "Process Street API key sent with the X-API-Key header. Generate it from organization settings in the Process Street app: https://public-api.process.st/api/v1.1/docs/openapi.json",
    },
  ],
  homepageUrl: "https://www.process.st/",
  actions: processStreetActions,
};
