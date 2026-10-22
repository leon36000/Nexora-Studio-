import type { ProviderDefinition } from "../../core/types.ts";

import { northbeamActions } from "./actions.ts";

const service = "northbeam";

export const provider: ProviderDefinition = {
  service,
  displayName: "Northbeam",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "NORTHBEAM_API_KEY",
      description:
        "Northbeam API key used in the Authorization header. Create or copy it from Settings > API Keys in the Northbeam dashboard.",
      extraFields: [
        {
          key: "clientId",
          label: "Data-Client-ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "NORTHBEAM_DATA_CLIENT_ID",
          description: "Northbeam Data-Client-ID UUID generated together with the API key in Settings > API Keys.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.northbeam.io",
  actions: northbeamActions,
};
