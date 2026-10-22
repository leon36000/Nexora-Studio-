import type { ProviderDefinition } from "../../core/types.ts";

import { vectorshiftActions } from "./actions.ts";

const service = "vectorshift";

export const provider: ProviderDefinition = {
  service,
  displayName: "VectorShift",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_VECTORSHIFT_API_KEY",
      description: "VectorShift API key used with the Authorization Bearer header.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://vectorshift.ai",
  actions: vectorshiftActions,
};
