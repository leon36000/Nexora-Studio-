import type { ProviderDefinition } from "../../core/types.ts";

import { gorgiasActions } from "./actions.ts";

const service = "gorgias";

export const provider: ProviderDefinition = {
  service,
  displayName: "Gorgias",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "gorgias_api_key",
      description:
        "Gorgias API key used as the Basic Auth password. Create or copy it in Settings > Account > REST API: https://docs.gorgias.com/en-US/rest-api-208286",
      extraFields: [
        {
          key: "email",
          label: "Account Email",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "agent@example.com",
          description:
            "Email address shown as Username in Gorgias REST API settings and used as the Basic Auth username: https://docs.gorgias.com/en-US/rest-api-208286",
        },
        {
          key: "domain",
          label: "Domain",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "your-domain",
          description:
            "Gorgias helpdesk domain from the Base API URL shown in REST API settings, used to build https://<domain>.gorgias.com requests: https://docs.gorgias.com/en-US/rest-api-208286",
        },
      ],
    },
  ],
  homepageUrl: "https://www.gorgias.com",
  actions: gorgiasActions,
};
