import type { ProviderDefinition } from "../../core/types.ts";

import { adyntelActions } from "./actions.ts";

const service = "adyntel";

export const provider: ProviderDefinition = {
  service,
  displayName: "Adyntel",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "adyntel_api_key",
      description:
        "Adyntel API key sent as the api_key field in JSON API requests. Find it in your Adyntel profile under Integrations: https://docs.adyntel.com/authorization.",
      extraFields: [
        {
          key: "email",
          label: "Account Email",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "user@example.com",
          description:
            "The Adyntel profile email sent with api_key on every API request. Use the email for the Adyntel profile that owns the key: https://docs.adyntel.com/authorization.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.adyntel.com",
  actions: adyntelActions,
};
