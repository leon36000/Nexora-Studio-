import type { ProviderDefinition } from "../../core/types.ts";

import { tinypngActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "tinypng",
  displayName: "TinyPNG",
  categories: ["Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "tinypng_api_key",
      description: "TinyPNG API key used with HTTP Basic authentication. Create it from your TinyPNG API dashboard.",
    },
  ],
  homepageUrl: "https://tinypng.com",
  actions: tinypngActions,
};
