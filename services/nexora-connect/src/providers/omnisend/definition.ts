import type { ProviderDefinition } from "../../core/types.ts";

import { omnisendActions } from "./actions.ts";

const service = "omnisend";

export const provider: ProviderDefinition = {
  service,
  displayName: "Omnisend",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "OMNISEND_API_KEY",
      description:
        "Omnisend API key used with the Authorization: Omnisend-API-Key header. Create or manage it in the Omnisend API keys section at https://app.omnisend.com/integrations/api-keys.",
    },
  ],
  homepageUrl: "https://www.omnisend.com",
  actions: omnisendActions,
};
