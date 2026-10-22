import type { ProviderDefinition } from "../../core/types.ts";

import { vecteraActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "vectera",
  displayName: "Vectera",
  description: "Manage Vectera meeting rooms, settings, permissions, and join links.",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "VECTERA_API_TOKEN",
      description:
        "Vectera API token sent as Authorization: Token <token>. Request a token from Vectera support, then view it at the bottom of your profile: https://www.vectera.com/profile/.",
    },
  ],
  homepageUrl: "https://go.vectera.com/",
  actions: vecteraActions,
};
