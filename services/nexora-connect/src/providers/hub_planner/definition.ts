import type { ProviderDefinition } from "../../core/types.ts";

import { hubPlannerActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "hub_planner",
  displayName: "Resource Flow (Hub Planner)",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "HUB_PLANNER_API_KEY",
      description:
        "Hub Planner API key sent directly in the Authorization header without a Bearer prefix. Account owners can enable API access and generate a read-only or read-write key from Settings > API; see the official guide: https://api-docs.hubplanner.com/.",
    },
  ],
  homepageUrl: "https://www.milientsoftware.com/hub-planner",
  actions: hubPlannerActions,
};
