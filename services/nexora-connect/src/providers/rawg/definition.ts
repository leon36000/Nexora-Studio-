import type { ProviderDefinition } from "../../core/types.ts";

import { rawgActions } from "./actions.ts";

const service = "rawg";

export const provider: ProviderDefinition = {
  service,
  displayName: "RAWG",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "RAWG_API_KEY",
      description: "RAWG API key passed as the key query parameter. Get it from https://rawg.io/apidocs.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://rawg.io",
  actions: rawgActions,
};
