import type { ProviderDefinition } from "../../core/types.ts";

import { certnActions } from "./actions.ts";

const service = "certn";

export const provider: ProviderDefinition = {
  service,
  displayName: "Certn",
  categories: ["Security", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "certn_api_key",
      description:
        "Certn API key sent as Authorization: Api-Key. Create and manage API keys in the Client Portal under Settings > Integrations > API Keys, as documented at https://centric-api-docs.certn.co/#authentication.",
      extraFields: [
        {
          key: "region",
          label: "Region",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "ca",
          description:
            "Certn API region for data domiciling. Use ca, uk, au, or sandbox as documented at https://centric-api-docs.certn.co/#introduction.",
        },
      ],
    },
  ],
  homepageUrl: "https://certn.co",
  actions: certnActions,
};
