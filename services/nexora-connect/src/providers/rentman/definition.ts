import type { ProviderDefinition } from "../../core/types.ts";

import { rentmanActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "rentman",
  displayName: "Rentman",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "JWT",
      placeholder: "rentman_jwt",
      description:
        "Rentman JWT used as a bearer token. Generate it in Rentman under Configuration > Integrations; the latest generated token is the only valid token: https://api.rentman.net/.",
    },
  ],
  homepageUrl: "https://rentman.io",
  actions: rentmanActions,
};
