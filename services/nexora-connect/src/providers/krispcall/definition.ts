import type { ProviderDefinition } from "../../core/types.ts";

import { krispcallActions } from "./actions.ts";

const service = "krispcall";

export const provider: ProviderDefinition = {
  service,
  displayName: "KrispCall",
  categories: ["Communication", "Productivity"],
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
          placeholder: "KRISPCALL_CLIENT_ID",
          description:
            "The KrispCall client ID from Settings > Public API. Create or copy API credentials from https://developer.krispcall.com/docs/getting-started.",
        },
        {
          key: "clientSecret",
          label: "Client Secret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "KRISPCALL_CLIENT_SECRET",
          description:
            "The KrispCall client secret paired with the client ID from Settings > Public API: https://developer.krispcall.com/docs/getting-started.",
        },
      ],
      testAction: {
        actionName: "get_workspace",
        input: {},
      },
    },
  ],
  homepageUrl: "https://krispcall.com",
  actions: krispcallActions,
};
