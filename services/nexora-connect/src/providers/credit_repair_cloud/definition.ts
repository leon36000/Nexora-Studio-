import type { ProviderDefinition } from "../../core/types.ts";

import { creditRepairCloudActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "credit_repair_cloud",
  displayName: "Credit Repair Cloud",
  categories: ["Marketing", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Auth Key",
      placeholder: "CREDIT_REPAIR_CLOUD_API_AUTH_KEY",
      description:
        "Credit Repair Cloud API auth key sent as the apiauthkey parameter. Log in and open API & Automations > API Credentials to view API credentials: https://app.creditrepaircloud.com/webapi.",
      extraFields: [
        {
          key: "secretKey",
          label: "Secret Key",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "CREDIT_REPAIR_CLOUD_SECRET_KEY",
          description:
            "Credit Repair Cloud secret key sent as the secretkey parameter. Log in and open API & Automations > API Credentials to view API credentials: https://app.creditrepaircloud.com/webapi.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.creditrepaircloud.com",
  actions: creditRepairCloudActions,
};
