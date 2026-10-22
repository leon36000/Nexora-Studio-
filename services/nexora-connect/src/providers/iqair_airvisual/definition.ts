import type { ProviderDefinition } from "../../core/types.ts";

import { iqairAirvisualActions } from "./actions.ts";

const service = "iqair_airvisual";

export const provider: ProviderDefinition = {
  service,
  displayName: "IQAir AirVisual",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "IQAIR_AIRVISUAL_API_KEY",
      description:
        "IQAir AirVisual API key sent with the key query parameter. Create or copy a key from the IQAir API dashboard: https://www.iqair.com/dashboard/api.",
    },
  ],
  homepageUrl: "https://www.iqair.com",
  actions: iqairAirvisualActions,
};
