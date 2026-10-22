import type { ProviderDefinition } from "../../core/types.ts";

import { castingwordsActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "castingwords",
  displayName: "CastingWords",
  categories: ["Design & Media", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CASTINGWORDS_API_KEY",
      description:
        "CastingWords API key used to order and retrieve transcriptions. Sign in and copy the API key from your account settings: https://castingwords.com/customer/info.",
    },
  ],
  homepageUrl: "https://castingwords.com",
  actions: castingwordsActions,
};
