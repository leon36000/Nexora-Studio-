import type { ProviderDefinition } from "../../core/types.ts";

import { kustomerActions } from "./actions.ts";

const service = "kustomer";

/**
 * Kustomer customer API provider.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Kustomer",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "KUSTOMER_API_KEY",
      description:
        "Kustomer API key sent as a Bearer token. Use a Kustomer API token with permissions for the customer endpoints; see the API introduction: https://help.kustomer.com/api-introduction-BkwVN42zM.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.kustomer.com",
  actions: kustomerActions,
};
