import type { ProviderDefinition } from "../../core/types.ts";

import { anydbActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "anydb",
  displayName: "AnyDB",
  categories: ["Data", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ANYDB_API_KEY",
      description:
        "AnyDB API key sent in the x-anydb-api-key header. Copy it from the Integration tab in your AnyDB profile: https://www.anydb.com/support/integrations/typescript-sdk/.",
      extraFields: [
        {
          key: "userEmail",
          label: "Account Email",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "user@example.com",
          description: "Email address of the AnyDB account that owns the API key, sent in the x-anydb-email header.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.anydb.com",
  actions: anydbActions,
};
