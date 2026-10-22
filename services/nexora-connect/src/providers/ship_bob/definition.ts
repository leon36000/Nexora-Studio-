import type { ProviderDefinition } from "../../core/types.ts";

import { shipBobActions } from "./actions.ts";

const service = "ship_bob";

export const provider: ProviderDefinition = {
  service,
  displayName: "ShipBob",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "SHIPBOB_PERSONAL_ACCESS_TOKEN",
      description:
        "ShipBob Personal Access Token sent with the Authorization: Bearer header. Generate one in the ShipBob dashboard under Integrations > API Tokens: https://web.shipbob.com/app/merchant/#/Integrations/token-management.",
    },
  ],
  homepageUrl: "https://www.shipbob.com/",
  actions: shipBobActions,
};
