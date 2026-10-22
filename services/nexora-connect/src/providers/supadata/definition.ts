import type { ProviderDefinition } from "../../core/types.ts";

import { supadataActions } from "./actions.ts";

const service = "supadata";

export const provider: ProviderDefinition = {
  service,
  displayName: "Supadata",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SUPADATA_API_KEY",
      description:
        "Supadata API key sent in the x-api-key header. Create or view keys in your Supadata dashboard: https://dash.supadata.ai",
    },
  ],
  homepageUrl: "https://supadata.ai/",
  actions: supadataActions,
};
