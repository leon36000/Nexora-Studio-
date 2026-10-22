import type { ProviderDefinition } from "../../core/types.ts";

import { ordinalActions } from "./actions.ts";

const service = "ordinal";

/**
 * Ordinal provider backed by workspace API keys.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Ordinal",
  categories: ["Social", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ord_...",
      description:
        "Ordinal workspace API key used with the Authorization Bearer header. Create one from the API Keys page in workspace settings: https://app.tryordinal.com/settings/integrations/api",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.tryordinal.com",
  actions: ordinalActions,
};
