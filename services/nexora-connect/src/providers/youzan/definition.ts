import type { ProviderDefinition } from "../../core/types.ts";

import { youzanActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "youzan",
  displayName: "Youzan",
  description: "Read shop, item, order, refund, and logistics data through the Youzan Cloud API.",
  categories: ["Marketing"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "clientId",
          label: "Client ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "Paste your Youzan Client ID",
          description:
            "The Client ID of a Youzan self-use app. Find it in the Youzan Cloud console: https://doc.youzanyun.com/v2/doc/cloud/token/StTtweZjrirPBKknYjXcwNoynNh.",
        },
        {
          key: "clientSecret",
          label: "Client Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "Paste your Youzan Client Secret",
          description:
            "The Client Secret of a Youzan self-use app. Find it with the Client ID in the Youzan Cloud console: https://doc.youzanyun.com/v2/doc/cloud/token/StTtweZjrirPBKknYjXcwNoynNh.",
        },
        {
          key: "grantId",
          label: "Store ID (kdt_id)",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "123456",
          description:
            "The Youzan store ID authorized to the self-use app. See how to find the kdt_id: https://doc.youzanyun.com/v2/doc/kdt_id.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.youzan.com/",
  actions: youzanActions,
};
