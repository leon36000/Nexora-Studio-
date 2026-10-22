import type { ProviderDefinition } from "../../core/types.ts";

import { theirstackActions } from "./actions.ts";

const service = "theirstack";

export const provider: ProviderDefinition = {
  service,
  displayName: "TheirStack",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ts_...",
      description: "TheirStack API key sent as a Bearer token.",
    },
  ],
  homepageUrl: "https://theirstack.com",
  actions: theirstackActions,
};
