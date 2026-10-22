import type { ProviderDefinition } from "../../core/types.ts";

import { replicateActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "replicate",
  displayName: "Replicate",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "r8_...",
      description:
        "Replicate API token used with the Authorization Bearer header. Create or manage tokens on the official API tokens page: https://replicate.com/account/api-tokens.",
    },
  ],
  homepageUrl: "https://replicate.com",
  actions: replicateActions,
};
