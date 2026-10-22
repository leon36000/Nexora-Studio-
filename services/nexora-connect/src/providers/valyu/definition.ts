import type { ProviderDefinition } from "../../core/types.ts";

import { valyuActions } from "./actions.ts";

const service = "valyu";

export const provider: ProviderDefinition = {
  service,
  displayName: "Valyu",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "vly-...",
      description:
        "Valyu API key sent in the X-API-Key header. Create or copy a key from the Valyu Platform API Keys page.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://valyu.ai",
  actions: valyuActions,
};
