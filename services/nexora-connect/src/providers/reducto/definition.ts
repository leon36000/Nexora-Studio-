import type { ProviderDefinition } from "../../core/types.ts";

import { reductoActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "reducto",
  displayName: "Reducto",
  categories: ["AI", "Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "REDUCTO_API_KEY",
      description:
        "Reducto API key sent with the Authorization Bearer header. Create or manage keys in Reducto Studio: https://studio.reducto.ai/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://reducto.ai",
  actions: reductoActions,
};
