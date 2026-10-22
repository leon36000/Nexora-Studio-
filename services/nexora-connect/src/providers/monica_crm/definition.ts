import type { ProviderDefinition } from "../../core/types.ts";

import { monicaCrmActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "monica_crm",
  displayName: "Monica CRM",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal OAuth Token",
      placeholder: "Monica personal OAuth token",
      description:
        "Monica personal OAuth token sent as a Bearer credential. Create it from the API settings documented at https://www.monicahq.com/api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.monicahq.com/",
  actions: monicaCrmActions,
};
