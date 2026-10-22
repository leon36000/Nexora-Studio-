import type { ProviderDefinition } from "../../core/types.ts";

import { icypeasActions } from "./actions.ts";

const service = "icypeas";

/**
 * Icypeas email discovery and verification provider.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Icypeas",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ICYPEAS_API_KEY",
      description:
        "Icypeas API key sent directly in the Authorization header. Enable API access and copy the key from the API section of your Icypeas profile: https://api-doc.icypeas.com/api-auth/access-keys.",
    },
  ],
  homepageUrl: "https://www.icypeas.com",
  actions: icypeasActions,
};
