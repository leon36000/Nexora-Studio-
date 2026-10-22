import type { ProviderDefinition } from "../../core/types.ts";

import { motherDuckActions } from "./actions.ts";

const service = "mother_duck";

export const provider: ProviderDefinition = {
  service,
  displayName: "MotherDuck",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "MOTHERDUCK_TOKEN",
      description:
        "MotherDuck access token used as a Bearer token for the Admin API. Create or view access tokens in MotherDuck settings: https://app.motherduck.com/settings/tokens.",
    },
  ],
  homepageUrl: "https://motherduck.com",
  actions: motherDuckActions,
};
