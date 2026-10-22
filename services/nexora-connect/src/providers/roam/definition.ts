import type { ProviderDefinition } from "../../core/types.ts";

import { roamActions } from "./actions.ts";

const service = "roam";

export const provider: ProviderDefinition = {
  service,
  displayName: "Roam HQ",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ROAM_API_KEY",
      description:
        "Roam HQ API key sent as a Bearer token. Create an API key in Roam Administration > Developer: https://ro.am/s/.",
    },
  ],
  homepageUrl: "https://ro.am",
  actions: roamActions,
};
