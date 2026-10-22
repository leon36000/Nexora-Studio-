import type { ProviderDefinition } from "../../core/types.ts";

import { greenhouseActions } from "./actions.ts";

/**
 * Greenhouse provider backed by the Harvest API.
 */
export const provider: ProviderDefinition = {
  service: "greenhouse",
  displayName: "Greenhouse",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Harvest API Key",
      placeholder: "GREENHOUSE_HARVEST_API_KEY",
      description:
        "Greenhouse Harvest API key used as the Basic Auth username with a blank password. Create it in Greenhouse under Configure > Dev Center > API Credential Management: https://developers.greenhouse.io/harvest.html#authentication.",
    },
  ],
  homepageUrl: "https://www.greenhouse.com",
  actions: greenhouseActions,
};
