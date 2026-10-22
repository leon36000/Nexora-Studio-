import type { ProviderDefinition } from "../../core/types.ts";

import { razorpayActions } from "./actions.ts";

const service = "razorpay";

export const provider: ProviderDefinition = {
  service,
  displayName: "Razorpay",
  categories: ["Finance", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Key Secret",
      placeholder: "rzp_test_xxxxxxxxxxxx",
      description:
        "Razorpay Key Secret used together with your Key ID for HTTP Basic Authentication. Generate API keys in Razorpay Dashboard > Account & Settings > API Keys.",
      extraFields: [
        {
          key: "keyId",
          label: "Key ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "rzp_test_xxxxxxxxxxxx",
          description: "Razorpay Key ID paired with the Key Secret for HTTP Basic Authentication.",
        },
      ],
    },
  ],
  homepageUrl: "https://razorpay.com",
  actions: razorpayActions,
};
