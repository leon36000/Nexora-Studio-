import type { ProviderDefinition } from "../../core/types.ts";

import { interzoidActions } from "./actions.ts";

const service = "interzoid";

/**
 * Interzoid provider backed by the public Interzoid APIs.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Interzoid",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API License Key",
      placeholder: "INTERZOID_LICENSE_KEY",
      description:
        "Interzoid API license key sent as the license query parameter. Sign up or view API keys from the Interzoid API pricing and account pages: https://www.interzoid.com/services/api-pricing",
    },
  ],
  homepageUrl: "https://www.interzoid.com/",
  actions: interzoidActions,
};
