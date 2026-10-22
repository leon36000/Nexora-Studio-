import type { ProviderDefinition } from "../../core/types.ts";

import { truveraActions } from "./actions.ts";

const service = "truvera";

export const provider: ProviderDefinition = {
  service,
  displayName: "Truvera",
  categories: ["Security", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "truvera_api_key",
      description:
        "Truvera API key used with the Authorization Bearer header. Match the server to where the key was created: https://api-testnet.truvera.io for test-mode keys or https://api.truvera.io for production keys.",
      extraFields: [
        {
          key: "apiBaseUrl",
          label: "API Base URL",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "https://api-testnet.truvera.io",
          description:
            "Optional Truvera API server root. Use https://api-testnet.truvera.io for test-mode keys or https://api.truvera.io for production keys.",
        },
      ],
    },
  ],
  homepageUrl: "https://truvera.io",
  actions: truveraActions,
};
