import type { ProviderDefinition } from "../../core/types.ts";

import { chargebeeActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "chargebee",
  displayName: "Chargebee",
  categories: ["Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CHARGEBEE_API_KEY",
      description:
        "Chargebee API key used as the HTTP Basic Auth username with an empty password. Create or view keys in the Chargebee admin console: https://www.chargebee.com/docs/api_keys.html",
      extraFields: [
        {
          key: "site",
          label: "Site",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "acme-test",
          description:
            "Your Chargebee site name from https://{site}.chargebee.com/api/v2. You can enter either the site name or the full Chargebee site URL.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.chargebee.com",
  actions: chargebeeActions,
};
