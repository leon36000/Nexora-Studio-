import type { ProviderDefinition } from "../../core/types.ts";

import { incidentIoActions } from "./actions.ts";

const service = "incident_io";

/**
 * incident.io provider backed by the public incident.io API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "incident.io",
  categories: ["Developer Tools", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "INCIDENT_IO_API_KEY",
      description:
        "incident.io API key sent as a Bearer token. Create one in the incident.io dashboard at https://app.incident.io/settings/api-keys.",
    },
  ],
  homepageUrl: "https://incident.io",
  actions: incidentIoActions,
};
