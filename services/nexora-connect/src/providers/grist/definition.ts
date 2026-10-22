import type { ProviderDefinition } from "../../core/types.ts";

import { gristActions } from "./actions.ts";

/**
 * Grist provider backed by the Grist Cloud REST API.
 */
export const provider: ProviderDefinition = {
  service: "grist",
  displayName: "Grist",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "grist_api_key",
      description:
        "Grist API key used with the Authorization Bearer header against Grist Cloud. Create it in Profile Settings > API: https://support.getgrist.com/rest-api/.",
    },
  ],
  homepageUrl: "https://www.getgrist.com",
  actions: gristActions,
};
