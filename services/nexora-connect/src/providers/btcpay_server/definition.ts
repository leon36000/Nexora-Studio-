import type { ProviderDefinition } from "../../core/types.ts";

import { btcpayServerActions } from "./actions.ts";

const service = "btcpay_server";

export const provider: ProviderDefinition = {
  service,
  displayName: "BTCPay Server",
  categories: ["Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "BTCPAY_API_KEY",
      description:
        "BTCPay Server API key sent with the Authorization header as token authentication. Create or manage API keys from your BTCPay Server user settings, or use the official Greenfield API documentation: https://docs.btcpayserver.org/API/Greenfield/v1/.",
      extraFields: [
        {
          key: "baseUrl",
          label: "Server URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://btcpay.example.com",
          description: "Base URL of your BTCPay Server instance. URLs ending in /api/v1 are also accepted.",
        },
      ],
    },
  ],
  homepageUrl: "https://btcpayserver.org",
  actions: btcpayServerActions,
};
