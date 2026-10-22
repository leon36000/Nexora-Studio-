import type { ProviderDefinition } from "../../core/types.ts";

import { pingdomActions } from "./actions.ts";

const service = "pingdom";

export const provider: ProviderDefinition = {
  service,
  displayName: "Pingdom",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "pingdom_api_token",
      description:
        "Pingdom API token used with the Authorization Bearer header. Generate it in My Pingdom under Integrations > The Pingdom API: https://my.solarwinds.cloud/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.pingdom.com",
  actions: pingdomActions,
};
