import type { ProviderDefinition } from "../../core/types.ts";

import { hotspotsystemActions } from "./actions.ts";

const service = "hotspotsystem";

/**
 * HotspotSystem provider backed by the HotspotSystem API v2.0.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "HotspotSystem",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "HOTSPOTSYSTEM_API_KEY",
      description: "HotspotSystem API key sent with the sn-apikey header.",
    },
  ],
  homepageUrl: "https://www.hotspotsystem.com",
  actions: hotspotsystemActions,
};
