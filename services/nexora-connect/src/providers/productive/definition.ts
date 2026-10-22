import type { ProviderDefinition } from "../../core/types.ts";

import { productiveActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "productive",
  displayName: "Productive",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "productive_api_token",
      description:
        "Productive API token sent with the X-Auth-Token header. Generate it in Productive under Settings > API integrations > Generate new token.",
      extraFields: [
        {
          key: "organizationId",
          label: "Organization ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "12345",
          description: "Numeric Productive organization ID sent with the X-Organization-Id header.",
        },
      ],
    },
  ],
  homepageUrl: "https://productive.io",
  actions: productiveActions,
};
