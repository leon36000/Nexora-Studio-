import type { ProviderDefinition } from "../../core/types.ts";

import { clicksendActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "clicksend",
  displayName: "ClickSend",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CLICKSEND_API_KEY",
      description:
        "ClickSend API key used as the Basic Auth password. Find or create it in the ClickSend Dashboard under Credentials: https://dashboard.clicksend.com/#/account/subaccount.",
      extraFields: [
        {
          key: "username",
          label: "API Username",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "CLICKSEND_USERNAME",
          description:
            "ClickSend API username used as the Basic Auth username. Copy it from the ClickSend Dashboard Credentials page: https://dashboard.clicksend.com/#/account/subaccount.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.clicksend.com/",
  actions: clicksendActions,
};
