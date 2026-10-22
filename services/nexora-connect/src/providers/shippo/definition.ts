import type { ProviderDefinition } from "../../core/types.ts";

import { shippoActions } from "./actions.ts";

const service = "shippo";

export const provider: ProviderDefinition = {
  service,
  displayName: "Shippo",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "SHIPPO_API_TOKEN",
      description:
        "Shippo API token used with the Authorization: ShippoToken header. Create or view tokens in Shippo API settings: https://app.goshippo.com/settings/api/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://goshippo.com",
  actions: shippoActions,
};
