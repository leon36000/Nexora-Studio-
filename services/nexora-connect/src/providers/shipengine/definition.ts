import type { ProviderDefinition } from "../../core/types.ts";

import { shipengineActions } from "./actions.ts";

const service = "shipengine";

export const provider: ProviderDefinition = {
  service,
  displayName: "ShipEngine",
  categories: ["Productivity", "Location"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SHIPENGINE_API_KEY",
      description:
        "ShipEngine API key used as the API-Key header. Create or manage keys from ShipEngine account settings: https://www.shipengine.com/docs/auth/",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.shipengine.com/",
  actions: shipengineActions,
};
