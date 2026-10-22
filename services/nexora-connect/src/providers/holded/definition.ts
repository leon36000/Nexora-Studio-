import type { ProviderDefinition } from "../../core/types.ts";

import { holdedActions } from "./actions.ts";

const service = "holded";

/**
 * Holded provider backed by the Holded API v2.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Holded",
  categories: ["Finance", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "HOLDED_API_TOKEN",
      description: "Holded API token used as a Bearer token.",
    },
  ],
  homepageUrl: "https://www.holded.com",
  actions: holdedActions,
};
