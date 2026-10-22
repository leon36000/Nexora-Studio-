import type { ProviderDefinition } from "../../core/types.ts";

import { moorchehActions } from "./actions.ts";

const service = "moorcheh";

export const provider: ProviderDefinition = {
  service,
  displayName: "Moorcheh",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MOORCHEH_API_KEY",
      description:
        "Moorcheh API key sent with the x-api-key header. Create or copy a key from the API Keys section at https://console.moorcheh.ai as described at https://docs.moorcheh.ai/guides/authentication.",
    },
  ],
  homepageUrl: "https://www.moorcheh.ai",
  actions: moorchehActions,
};
