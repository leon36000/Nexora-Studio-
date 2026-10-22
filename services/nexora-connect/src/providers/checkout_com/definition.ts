import type { ProviderDefinition } from "../../core/types.ts";

import { checkoutComActions } from "./actions.ts";
export const provider: ProviderDefinition = {
  service: "checkout_com",
  displayName: "Checkout.com",
  categories: ["Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Secret API Key",
      placeholder: "sk_sbox_... or sk_...",
      description: "Checkout.com Secret API Key from Developers > Keys.",
      extraFields: [
        {
          key: "environment",
          label: "Environment",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "sandbox or production",
          description: "Checkout.com environment: sandbox or production.",
        },
        {
          key: "prefix",
          label: "Endpoint Prefix",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "vkuhvk4v",
          description: "The 8-character prefix from the unique Checkout.com API base URL.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.checkout.com",
  actions: checkoutComActions,
};
