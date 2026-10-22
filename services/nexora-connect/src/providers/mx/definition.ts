import type { ProviderDefinition } from "../../core/types.ts";

import { mxActions } from "./actions.ts";

const service = "mx";

export const provider: ProviderDefinition = {
  service,
  displayName: "MX",
  categories: ["Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MX_API_KEY",
      description:
        "MX Platform API key used as the Basic Auth password. View or copy keys from MX Client Dashboard > API keys: https://docs.mx.com/resources/client-dashboard/manage-api-keys.",
      extraFields: [
        {
          key: "clientId",
          label: "Client ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "MX_CLIENT_ID",
          description:
            "MX Platform API client_id used as the Basic Auth username. It is issued with and paired to the API key.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.mx.com",
  actions: mxActions,
};
