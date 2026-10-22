import type { ProviderDefinition } from "../../core/types.ts";

import { lightspeedVtActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "lightspeed_vt",
  displayName: "LightSpeed VT",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_API_KEY",
      description:
        "LightSpeed VT API key used as the HTTP Basic username. Obtain it from the Integration Panel: https://lightspeedvt.readme.io/reference/authentication-1",
      extraFields: [
        {
          key: "apiSecret",
          label: "API Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "YOUR_API_SECRET",
          description: "LightSpeed VT API password paired with the API key.",
        },
      ],
    },
  ],
  homepageUrl: "https://lightspeedvt.com/",
  actions: lightspeedVtActions,
};
