import type { ProviderDefinition } from "../../core/types.ts";

import { outlineActions } from "./actions.ts";

const service = "outline";

export const provider: ProviderDefinition = {
  service,
  displayName: "Outline",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ol_api_...",
      description:
        "Outline API key used with the Authorization Bearer header. Create or manage keys in your Outline workspace under Settings -> API Keys: https://docs.getoutline.com/s/guide/doc/api-1rEIXDfLF6.",
      extraFields: [
        {
          key: "baseUrl",
          label: "Base URL",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "https://app.getoutline.com/api",
          description:
            "Optional Outline API base URL. Use the cloud default, or your self-hosted Outline URL ending in /api.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.getoutline.com",
  actions: outlineActions,
};
