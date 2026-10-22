import type { ProviderDefinition } from "../../core/types.ts";

import { roamScimActions } from "./actions.ts";

const service = "roam_scim";

export const provider: ProviderDefinition = {
  service,
  displayName: "Roam SCIM",
  categories: ["Security", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "SCIM Bearer Token",
      placeholder: "ROAM_SCIM_BEARER_TOKEN",
      description:
        "Roam SCIM bearer token sent in the Authorization header. Enable SCIM in Roam Administration > Technical Setup to generate the token: https://ro.am/s/.",
    },
  ],
  homepageUrl: "https://ro.am",
  actions: roamScimActions,
};
