import type { ProviderDefinition } from "../../core/types.ts";

import { bouncerActions } from "./actions.ts";

const service = "bouncer";

export const provider: ProviderDefinition = {
  service,
  displayName: "Bouncer",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "BOUNCER_API_KEY",
      description: "Bouncer API key sent with the x-api-key header.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.usebouncer.com/",
  actions: bouncerActions,
};
