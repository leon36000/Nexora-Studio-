import type { ProviderDefinition } from "../../core/types.ts";

import { hereActions } from "./actions.ts";

const service = "here";

/**
 * HERE Geocoding and Search API provider.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "HERE",
  categories: ["Location", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "HERE_API_KEY",
      description:
        "HERE API key sent as the apiKey query parameter. Create it in HERE Platform Access Manager on an app's Credentials tab: https://platform.here.com/.",
    },
  ],
  homepageUrl: "https://www.here.com",
  actions: hereActions,
};
