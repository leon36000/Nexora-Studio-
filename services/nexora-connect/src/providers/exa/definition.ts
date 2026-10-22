import type { ProviderDefinition } from "../../core/types.ts";

import { exaActions } from "./actions.ts";

const service = "exa";

export const provider: ProviderDefinition = {
  service,
  displayName: "Exa",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "EXA_API_KEY",
      description: "Exa API key used with the x-api-key request header. Get it from the Exa Dashboard.",
    },
  ],
  homepageUrl: "https://exa.ai",
  actions: exaActions,
};
