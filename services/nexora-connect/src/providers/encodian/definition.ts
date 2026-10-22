import type { ProviderDefinition } from "../../core/types.ts";

import { encodianActions } from "./actions.ts";

const service = "encodian";

export const provider: ProviderDefinition = {
  service,
  displayName: "Encodian",
  categories: ["Productivity", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "encodian_api_key",
      description:
        "Encodian API key sent with the X-ApiKey header. Generate or manage keys from the Encodian API key portal: https://www.encodian.com/apikey/.",
      extraFields: [
        {
          key: "apiBaseUrl",
          label: "Regional API Host",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "https://us-api.apps-encodian.com",
          description:
            "Optional Encodian regional API host. Leave empty to use the default host at https://api.apps-encodian.com.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.encodian.com",
  actions: encodianActions,
};
