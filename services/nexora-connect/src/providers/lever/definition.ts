import type { ProviderDefinition } from "../../core/types.ts";

import { leverActions } from "./actions.ts";

const service = "lever";

/**
 * Lever provider backed by the Lever API v1.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Lever",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "LEVER_API_KEY",
      description:
        "Lever API key used as the Basic Auth username. Create or manage API keys in Lever under Settings > Integrations and API: https://hire.lever.co/settings/integrations.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.lever.co",
  actions: leverActions,
};
