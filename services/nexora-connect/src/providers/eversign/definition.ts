import type { ProviderDefinition } from "../../core/types.ts";

import { eversignActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "eversign",
  displayName: "Xodo Sign",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Access Key",
      placeholder: "XODO_SIGN_ACCESS_KEY",
      description:
        "Xodo Sign API access key sent as the access_key query parameter. In your Xodo Sign account, open the top-left menu and select Developer to view or reset it: https://support.apryse.com/support/solutions/articles/35000297407-api-frequently-asked-questions",
    },
  ],
  homepageUrl: "https://eversign.com/",
  actions: eversignActions,
};
