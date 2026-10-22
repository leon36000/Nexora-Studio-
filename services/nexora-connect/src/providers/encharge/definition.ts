import type { ProviderDefinition } from "../../core/types.ts";

import { enchargeActions } from "./actions.ts";

const service = "encharge";

export const provider: ProviderDefinition = {
  service,
  displayName: "Encharge",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ENCHARGE_API_KEY",
      description:
        "Encharge API key used with the X-Encharge-Token header. Get it from your Encharge account page: https://app.encharge.io/account/info.",
    },
  ],
  homepageUrl: "https://encharge.io",
  actions: enchargeActions,
};
