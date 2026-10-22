import type { ProviderDefinition } from "../../core/types.ts";

import { lucidScimActions } from "./actions.ts";

const service = "lucid_scim";

export const provider: ProviderDefinition = {
  service,
  displayName: "Lucid SCIM",
  categories: ["Security", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "SCIM Bearer Token",
      placeholder: "LUCID_SCIM_BEARER_TOKEN",
      description:
        "Lucid SCIM bearer token sent in the Authorization header. Generate it in Lucid Admin under App integration > SCIM for admin management or SCIM for content access: https://lucid.app/teams#/apps/integrations-general/scim-for-admin-management",
      extraFields: [],
    },
  ],
  homepageUrl: "https://lucid.co",
  actions: lucidScimActions,
};
