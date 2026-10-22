import type { ProviderDefinition } from "../../core/types.ts";

import { docusealActions } from "./actions.ts";

const service = "docuseal";

export const provider: ProviderDefinition = {
  service,
  displayName: "DocuSeal",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DOCUSEAL_API_KEY",
      description:
        "DocuSeal API key sent with the X-Auth-Token header. Create or copy it from the DocuSeal API settings page.",
      extraFields: [
        {
          key: "region",
          label: "Region",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "com",
          description:
            "DocuSeal API region for your account. Use com for https://api.docuseal.com or eu for https://api.docuseal.eu.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.docuseal.com",
  actions: docusealActions,
};
