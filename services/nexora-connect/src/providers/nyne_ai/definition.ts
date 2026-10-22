import type { ProviderDefinition } from "../../core/types.ts";

import { nyneAiActions } from "./actions.ts";

const service = "nyne_ai";

export const provider: ProviderDefinition = {
  service,
  displayName: "Nyne.ai",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "NYNE_API_KEY",
      description:
        "Nyne.ai API key sent with the X-API-Key header. Generate API keys from the Nyne.ai API keys dashboard: https://nyne.ai/api-keys.",
      extraFields: [
        {
          key: "apiSecret",
          label: "API Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "NYNE_API_SECRET",
          description:
            "Nyne.ai API secret sent with the X-API-Secret header. Generate it together with the API key from the Nyne.ai API keys dashboard: https://nyne.ai/api-keys.",
        },
      ],
    },
  ],
  homepageUrl: "https://nyne.ai",
  actions: nyneAiActions,
};
