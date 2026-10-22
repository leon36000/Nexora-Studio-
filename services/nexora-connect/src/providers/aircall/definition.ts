import type { ProviderDefinition } from "../../core/types.ts";

import { aircallActions } from "./actions.ts";

const service = "aircall";

export const provider: ProviderDefinition = {
  service,
  displayName: "Aircall",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "AIRCALL_API_TOKEN",
      description:
        "Aircall API token used as the Basic Auth password. Generate or view API credentials in Aircall Dashboard integrations: https://dashboard.aircall.io/integrations/api.",
      extraFields: [
        {
          key: "apiId",
          label: "API ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "AIRCALL_API_ID",
          description:
            "Aircall API ID used as the Basic Auth username. Generate or view it with the API token in Aircall Dashboard integrations: https://dashboard.aircall.io/integrations/api.",
        },
      ],
    },
  ],
  homepageUrl: "https://aircall.io",
  actions: aircallActions,
};
