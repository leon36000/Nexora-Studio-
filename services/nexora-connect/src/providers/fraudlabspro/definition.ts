import type { ProviderDefinition } from "../../core/types.ts";

import { fraudlabsproActions } from "./actions.ts";

const service = "fraudlabspro";

/**
 * FraudLabs Pro fraud screening provider backed by the public v2 API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "FraudLabs Pro",
  categories: ["Security", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API License Key",
      placeholder: "FRAUDLABSPRO_API_KEY",
      description:
        "FraudLabs Pro API license key passed as the key parameter. Get it from your FraudLabs Pro merchant area: https://www.fraudlabspro.com/merchant/sign-in.",
    },
  ],
  homepageUrl: "https://www.fraudlabspro.com/",
  actions: fraudlabsproActions,
};
