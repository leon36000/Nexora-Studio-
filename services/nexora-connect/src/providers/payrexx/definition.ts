import type { ProviderDefinition } from "../../core/types.ts";

import { payrexxActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "payrexx",
  displayName: "Payrexx",
  categories: ["Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Secret",
      placeholder: "PAYREXX_API_SECRET",
      description:
        "Payrexx API Secret sent in the X-API-KEY header. View it under API and Plugins: https://docs.payrexx.com/merchant/english/account/api-and-plugins.",
      extraFields: [
        {
          key: "instance",
          label: "Instance",
          required: true,
          secret: false,
          inputType: "text",
          placeholder: "example",
          description: "Your Payrexx instance name from https://{instance}.payrexx.com.",
        },
      ],
    },
  ],
  homepageUrl: "https://payrexx.com",
  actions: payrexxActions,
};
