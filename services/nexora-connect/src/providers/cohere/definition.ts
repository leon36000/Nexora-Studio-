import type { ProviderDefinition } from "../../core/types.ts";

import { cohereActions } from "./actions.ts";

const service = "cohere";

export const provider: ProviderDefinition = {
  service,
  displayName: "Cohere",
  categories: ["AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "cohere_api_key",
      description:
        "Cohere API key used with the Authorization Bearer header. Create or copy one from https://dashboard.cohere.com/api-keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://cohere.com",
  actions: cohereActions,
};
