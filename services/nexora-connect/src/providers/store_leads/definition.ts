import type { ProviderDefinition } from "../../core/types.ts";

import { storeLeadsActions } from "./actions.ts";

const service = "store_leads";

export const provider: ProviderDefinition = {
  service,
  displayName: "Store Leads",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "a174****-****-****-****-****c6ee",
      description:
        'Store Leads API key sent with the Authorization Bearer header. Generate it from the "API" tab of your Store Leads account page.',
      extraFields: [],
    },
  ],
  homepageUrl: "https://storeleads.app",
  actions: storeLeadsActions,
};
