import type { ProviderDefinition } from "../../core/types.ts";

import { pendoActions } from "./actions.ts";

const service = "pendo";

export const provider: ProviderDefinition = {
  service,
  displayName: "Pendo",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Integration Key",
      placeholder: "PENDO_INTEGRATION_KEY",
      description:
        "Pendo integration key sent with the x-pendo-integration-key header. Create it in Pendo Settings > Integrations > Integration Keys: https://app.pendo.io/admin/integrationkeys.",
      extraFields: [
        {
          key: "region",
          label: "Region",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "us",
          description:
            "Pendo application region used for API requests. Supported values are us, eu, us1, japan, and australia. Leave empty for us.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.pendo.io",
  actions: pendoActions,
};
