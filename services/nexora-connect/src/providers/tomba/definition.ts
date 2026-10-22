import type { ProviderDefinition } from "../../core/types.ts";

import { tombaActions } from "./actions.ts";

const service = "tomba";

export const provider: ProviderDefinition = {
  service,
  displayName: "Tomba",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ta_...",
      description:
        "Tomba API key used with the X-Tomba-Key header. Find or create API credentials in the Tomba API Keys page.",
      extraFields: [
        {
          key: "apiSecret",
          label: "API Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "Your Tomba API secret",
          description: "Tomba API secret used with the X-Tomba-Secret header.",
        },
      ],
    },
  ],
  homepageUrl: "https://tomba.io",
  actions: tombaActions,
};
