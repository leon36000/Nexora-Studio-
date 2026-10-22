import type { ProviderDefinition } from "../../core/types.ts";

import { neutrinoActions } from "./actions.ts";

const service = "neutrino";

export const provider: ProviderDefinition = {
  service,
  displayName: "Neutrino API",
  categories: ["Data", "Location", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "NEUTRINO_API_KEY",
      description:
        "Neutrino API key sent with the API-Key header. View your API key in the Neutrino API dashboard: https://www.neutrinoapi.com/account/dashboard/.",
      extraFields: [
        {
          key: "userId",
          label: "User ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "NEUTRINO_USER_ID",
          description:
            "Neutrino User ID paired with the API key and sent with the User-ID header. View it in the Neutrino API dashboard: https://www.neutrinoapi.com/account/dashboard/.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.neutrinoapi.com/",
  actions: neutrinoActions,
};
