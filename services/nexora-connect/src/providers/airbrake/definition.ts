import type { ProviderDefinition } from "../../core/types.ts";

import { airbrakeActions } from "./actions.ts";

const service = "airbrake";

export const provider: ProviderDefinition = {
  service,
  displayName: "Airbrake",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "User API Key",
      placeholder: "AIRBRAKE_USER_API_KEY",
      description:
        "Airbrake User API key sent as the key query parameter. Airbrake documents User API keys for accessing project data: https://docs.airbrake.io/docs/devops-tools/api/#authentication",
      extraFields: [],
    },
  ],
  homepageUrl: "https://airbrake.io",
  actions: airbrakeActions,
};
