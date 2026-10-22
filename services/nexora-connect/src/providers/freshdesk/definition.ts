import type { ProviderDefinition } from "../../core/types.ts";

import { freshdeskActions } from "./actions.ts";

const service = "freshdesk";

/**
 * Freshdesk provider backed by the public Freshdesk API v2.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Freshdesk",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "FRESHDESK_API_KEY",
      description:
        "Freshdesk API key used as the Basic Auth username. Find it in Profile Settings > View API key: https://support.freshdesk.com/support/solutions/articles/215517-how-to-find-your-api-key.",
      extraFields: [
        {
          key: "domain",
          label: "Domain",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "your-helpdesk",
          description: "Freshdesk account domain used to build https://<domain>.freshdesk.com requests.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.freshworks.com/freshdesk/",
  actions: freshdeskActions,
};
