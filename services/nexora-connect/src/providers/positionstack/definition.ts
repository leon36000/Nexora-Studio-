import type { ProviderDefinition } from "../../core/types.ts";

import { positionstackActions } from "./actions.ts";

const service = "positionstack";

export const provider: ProviderDefinition = {
  service,
  displayName: "Positionstack",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "POSITIONSTACK_API_KEY",
      description:
        "Positionstack API key sent as the access_key query parameter. Get a free key at https://positionstack.com/signup/free/ or manage API keys in APILayer: https://apilayer.com/docs/article/managing-api-keys.",
    },
  ],
  homepageUrl: "https://positionstack.com",
  actions: positionstackActions,
};
