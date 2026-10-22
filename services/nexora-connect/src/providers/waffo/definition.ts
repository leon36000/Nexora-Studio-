import type { ProviderDefinition } from "../../core/types.ts";

import { waffoActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "waffo",
  displayName: "Waffo Pancake",
  categories: ["Finance"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "merchantId",
          label: "Merchant ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "MER_...",
          description:
            "The Waffo Merchant ID shown under Dashboard → API & Development → API Keys. See https://docs.waffo.ai/api-reference/authentication.",
        },
        {
          key: "privateKey",
          label: "API Private Key",
          inputType: "textarea",
          required: true,
          secret: true,
          placeholder: "-----BEGIN PRIVATE KEY-----",
          description:
            "The RSA private key downloaded when creating a Waffo API key. Paste PEM text or use escaped \\n line breaks. Waffo shows the key only once: https://docs.waffo.ai/api-reference/authentication.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.waffo.ai",
  actions: waffoActions,
};
