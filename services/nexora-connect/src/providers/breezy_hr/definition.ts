import type { ProviderDefinition } from "../../core/types.ts";

import { breezyHrActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "breezy_hr",
  displayName: "Breezy HR",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "breezy_pat_...",
      description:
        "Breezy HR Personal Access Token sent as the Authorization header value. Manage API access from Breezy HR company settings under Integrations > API: https://developer.breezy.hr/reference/customer-guide",
    },
  ],
  homepageUrl: "https://breezy.hr/",
  actions: breezyHrActions,
};
