import type { ProviderDefinition } from "../../core/types.ts";

import { graphhopperActions } from "./actions.ts";

/**
 * GraphHopper provider backed by the public GraphHopper API.
 */
export const provider: ProviderDefinition = {
  service: "graphhopper",
  displayName: "GraphHopper",
  categories: ["Location", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "GRAPHHOPPER_API_KEY",
      description:
        "GraphHopper API key sent as the key query parameter. Create or manage API keys in the GraphHopper dashboard: https://www.graphhopper.com/dashboard/.",
    },
  ],
  homepageUrl: "https://www.graphhopper.com",
  actions: graphhopperActions,
};
