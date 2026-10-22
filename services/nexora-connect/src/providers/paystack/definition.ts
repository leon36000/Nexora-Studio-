import type { ProviderDefinition } from "../../core/types.ts";

import { paystackActions } from "./actions.ts";

const service = "paystack";

export const provider: ProviderDefinition = {
  service,
  displayName: "Paystack",
  categories: ["Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Secret Key",
      placeholder: "sk_test_...",
      description:
        "Paystack secret key used with the Authorization Bearer header. Manage keys from https://paystack.com/docs/api/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://paystack.com",
  actions: paystackActions,
};
