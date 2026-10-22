import type { ProviderDefinition } from "../../core/types.ts";

import { brexActions } from "./actions.ts";

const service = "brex";

export const provider: ProviderDefinition = {
  service,
  displayName: "Brex",
  categories: ["Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "User Token",
      placeholder: "bxt_...",
      description:
        "Brex user token sent as an Authorization: Bearer header. Create or revoke tokens in Brex Dashboard developer settings: https://dashboard.brex.com/settings/developer.",
    },
  ],
  homepageUrl: "https://www.brex.com/",
  actions: brexActions,
};
