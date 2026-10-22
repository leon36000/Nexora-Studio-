import type { ProviderDefinition } from "../../core/types.ts";

import { vidaActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "vida",
  displayName: "Vida",
  categories: ["AI", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "VIDA_API_TOKEN",
      description:
        "Vida API token passed as the token query parameter. Manage tokens under Settings > Developers: https://vida.io/docs/api-reference/authentication.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://vida.io/",
  actions: vidaActions,
};
