import type { ProviderDefinition } from "../../core/types.ts";

import { docugenerateActions } from "./actions.ts";

const service = "docugenerate";

export const provider: ProviderDefinition = {
  service,
  displayName: "DocuGenerate",
  categories: ["Productivity", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "DOCUGENERATE_API_KEY",
      description:
        "DocuGenerate API key sent with the Authorization header. Create or view the key on the Developers settings page: https://app.docugenerate.com/settings/developers.",
      extraFields: [
        {
          key: "region",
          label: "Region",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "us",
          description:
            "Optional DocuGenerate processing region: us, eu, uk, or au. The default is us. See the official regional endpoint guide: https://www.docugenerate.com/help/articles/can-i-use-regional-api-endpoints/.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.docugenerate.com",
  actions: docugenerateActions,
};
