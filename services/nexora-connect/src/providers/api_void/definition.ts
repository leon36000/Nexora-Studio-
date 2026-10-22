import type { ProviderDefinition } from "../../core/types.ts";

import { apiVoidActions } from "./actions.ts";

const service = "api_void";

export const provider: ProviderDefinition = {
  service,
  displayName: "APIVoid",
  categories: ["Security", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "APIVOID_API_KEY",
      description:
        "APIVoid API key sent with the X-API-Key header. Create or view API keys in the APIVoid dashboard: https://dash.apivoid.com/.",
    },
  ],
  homepageUrl: "https://www.apivoid.com/",
  actions: apiVoidActions,
};
