import type { ProviderDefinition } from "../../core/types.ts";

import { shipStationActions } from "./actions.ts";

const service = "ship_station";

export const provider: ProviderDefinition = {
  service,
  displayName: "ShipStation",
  categories: ["Productivity", "Location"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SHIPSTATION_API_KEY",
      description:
        "ShipStation API key used as the API-Key header for V2 API requests. Generate and copy it from your ShipStation account API settings: https://docs.shipstation.com/authentication",
    },
  ],
  homepageUrl: "https://www.shipstation.com/",
  actions: shipStationActions,
};
