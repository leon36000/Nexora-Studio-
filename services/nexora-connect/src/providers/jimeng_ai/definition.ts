import type { ProviderDefinition } from "../../core/types.ts";

import { jimengAiActions } from "./actions.ts";

const service = "jimeng_ai";

/**
 * Jimeng AI provider backed by Volcengine-signed Visual API requests.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Jimeng AI",
  categories: ["AI", "Design & Media"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "accessKeyId",
          label: "Access Key ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "AKLT...",
          description:
            "Volcengine access key ID used to sign Jimeng AI requests. Create or manage access keys in Volcengine Access Key management: https://console.volcengine.com/iam/keymanage/.",
        },
        {
          key: "secretAccessKey",
          label: "Secret Access Key",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "Your Volcengine secret access key",
          description:
            "Volcengine secret access key paired with the access key ID. Volcengine shows it when you create or manage keys: https://www.volcengine.com/docs/6291/65568.",
        },
        {
          key: "sessionToken",
          label: "Session Token",
          inputType: "password",
          required: false,
          secret: true,
          placeholder: "Optional STS session token",
          description: "Optional Volcengine temporary security token used with STS credentials.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.volcengine.com/product/jimeng",
  actions: jimengAiActions,
};
