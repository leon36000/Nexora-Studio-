import type { ProviderDefinition } from "../../core/types.ts";

import { rocketlaneActions } from "./actions.ts";

const service = "rocketlane";

export const provider: ProviderDefinition = {
  service,
  displayName: "Rocketlane",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ROCKETLANE_API_KEY",
      description:
        "Rocketlane API key sent with the api-key header. Generate it in Rocketlane under Profile > Settings > API.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.rocketlane.com",
  actions: rocketlaneActions,
};
