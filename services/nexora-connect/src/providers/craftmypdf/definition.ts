import type { ProviderDefinition } from "../../core/types.ts";

import { craftmypdfActions } from "./actions.ts";

const service = "craftmypdf";

export const provider: ProviderDefinition = {
  service,
  displayName: "CraftMyPDF",
  categories: ["Design & Media", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "craftmypdf_api_key",
      description:
        "CraftMyPDF API key sent with the X-API-KEY header. Get or reset it from the CraftMyPDF web console under API Integration, as described in the official docs: https://craftmypdf.com/docs/index.html.",
      extraFields: [
        {
          key: "apiBaseUrl",
          label: "Regional API Base URL",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "https://api-us.craftmypdf.com",
          description:
            "Optional CraftMyPDF regional endpoint root or full /v1 base URL. Official regional endpoints are listed at https://craftmypdf.com/docs/index.html.",
        },
      ],
    },
  ],
  homepageUrl: "https://craftmypdf.com",
  actions: craftmypdfActions,
};
