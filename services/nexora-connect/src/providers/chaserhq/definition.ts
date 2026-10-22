import type { ProviderDefinition } from "../../core/types.ts";

import { chaserhqActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "chaserhq",
  displayName: "ChaserHQ",
  categories: ["Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CHASER_API_KEY",
      description:
        "Chaser API key used with the API Secret through HTTP Basic authentication. Find both values in Chaser under Organisation Settings > Integrations > Get API keys: https://my.chaserhq.com/settings/integrations",
      extraFields: [
        {
          key: "apiSecret",
          label: "API Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "CHASER_API_SECRET",
          description: "Chaser API Secret paired with the API Key for HTTP Basic authentication.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.chaserhq.com/",
  actions: chaserhqActions,
};
