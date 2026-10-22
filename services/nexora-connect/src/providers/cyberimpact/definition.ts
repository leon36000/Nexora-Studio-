import type { ProviderDefinition } from "../../core/types.ts";

import { cyberimpactActions } from "./actions.ts";

const service = "cyberimpact";

export const provider: ProviderDefinition = {
  service,
  displayName: "Cyberimpact",
  categories: ["Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "eyJ...",
      description:
        "Cyberimpact API token sent as a Bearer token. Create and manage API tokens in Cyberimpact under Developers > API tokens.",
    },
  ],
  homepageUrl: "https://www.cyberimpact.com/",
  actions: cyberimpactActions,
};
