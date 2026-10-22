import type { ProviderDefinition } from "../../core/types.ts";

import { seventeenTrackActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "17track",
  displayName: "17TRACK",
  categories: ["Productivity", "Location"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "17TRACK_API_KEY",
      description:
        "17TRACK API key sent in the 17token header. Get or change the key in 17TRACK API Settings: https://api.17track.net/admin/settings.",
    },
  ],
  homepageUrl: "https://www.17track.net/",
  actions: seventeenTrackActions,
};
