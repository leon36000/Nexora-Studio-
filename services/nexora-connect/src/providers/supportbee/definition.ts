import type { ProviderDefinition } from "../../core/types.ts";

import { supportbeeActions } from "./actions.ts";

const service = "supportbee";

export const provider: ProviderDefinition = {
  service,
  displayName: "SupportBee",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "supportbee_api_token",
      description:
        "SupportBee API token sent as an Authorization Bearer token. Find it from your SupportBee desk by clicking your profile picture and then API Token: https://supportbee.com/docs/api/api",
      extraFields: [
        {
          key: "company",
          label: "Company Subdomain",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "your-company",
          description: "The SupportBee desk subdomain used to build https://<company>.supportbee.com API requests.",
        },
      ],
    },
  ],
  homepageUrl: "https://supportbee.com",
  actions: supportbeeActions,
};
