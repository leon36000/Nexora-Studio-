import type { ProviderDefinition } from "../../core/types.ts";

import { affindaActions } from "./actions.ts";

const service = "affinda";

export const provider: ProviderDefinition = {
  service,
  displayName: "Affinda",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "AFFINDA_API_KEY",
      description:
        "Affinda API key sent as a Bearer token. Create and rotate keys from your Affinda user settings: https://docs.affinda.com/reference/authentication.",
      extraFields: [
        {
          key: "apiBaseUrl",
          label: "API Base URL",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "https://api.affinda.com",
          description:
            "Official Affinda API base URL for your account region. Use https://api.affinda.com, https://api.us1.affinda.com, or https://api.eu1.affinda.com.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.affinda.com",
  actions: affindaActions,
};
