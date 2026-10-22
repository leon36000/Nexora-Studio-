import type { ProviderDefinition } from "../../core/types.ts";

import { freshserviceActions } from "./actions.ts";

const service = "freshservice";

/**
 * Freshservice provider backed by the public Freshservice API v2.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Freshservice",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "freshservice_api_key",
      description:
        "Freshservice API key used as the HTTP Basic auth username. Find it in your Freshservice profile settings as documented by Freshworks: https://support.freshservice.com/support/solutions/articles/50000000029-where-do-i-find-my-api-key-.",
      extraFields: [
        {
          key: "domain",
          label: "Domain",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "your-service-desk",
          description: "Freshservice account domain used to build https://<domain>.freshservice.com API requests.",
        },
        {
          key: "workspaceId",
          label: "Workspace ID",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "2",
          description: "Optional default Freshservice workspace ID stored for MSP or multi-workspace accounts.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.freshworks.com/freshservice/",
  actions: freshserviceActions,
};
