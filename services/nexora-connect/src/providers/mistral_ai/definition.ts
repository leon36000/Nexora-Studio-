import type { ProviderDefinition } from "../../core/types.ts";

import { mistralAiActions } from "./actions.ts";

const service = "mistral_ai";

export const provider: ProviderDefinition = {
  service,
  displayName: "Mistral AI",
  categories: ["AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "mistral_api_key",
      description:
        "Mistral API key used with the Authorization Bearer header. Create or manage keys in the Mistral Console: https://console.mistral.ai/api-keys/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://mistral.ai",
  actions: mistralAiActions,
};
