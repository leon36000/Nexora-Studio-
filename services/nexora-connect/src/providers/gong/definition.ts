import type { ProviderDefinition } from "../../core/types.ts";

import { gongActions } from "./actions.ts";

const service = "gong";

export const provider: ProviderDefinition = {
  service,
  displayName: "Gong",
  categories: ["Data", "Productivity"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "apiBaseUrl",
          label: "API Base URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://api.gong.io",
          description:
            "Gong API base URL for your company. Check it in Gong under Admin center > Settings > Ecosystem > API as described at https://help.gong.io/docs/receive-access-to-the-api.",
        },
        {
          key: "accessKey",
          label: "Access Key",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "GONG_ACCESS_KEY",
          description:
            "Gong Access Key used as the Basic Auth username. Generate it in Gong under Admin center > Settings > Ecosystem > API: https://help.gong.io/docs/receive-access-to-the-api.",
        },
        {
          key: "accessKeySecret",
          label: "Access Key Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "GONG_ACCESS_KEY_SECRET",
          description:
            "Gong Access Key Secret used as the Basic Auth password. Copy it when generating the key in Gong under Admin center > Settings > Ecosystem > API: https://help.gong.io/docs/receive-access-to-the-api.",
        },
      ],
      testAction: {
        actionName: "list_users",
        input: {
          includeAvatars: false,
        },
      },
    },
  ],
  homepageUrl: "https://www.gong.io/",
  actions: gongActions,
};
