import type { ProviderDefinition } from "../../core/types.ts";

import { chatApiForWhatsappActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "chat_api_for_whatsapp",
  displayName: "Chat API for WhatsApp",
  categories: ["Communication", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Token",
      placeholder: "CHAT_API_TOKEN",
      description:
        "Chat API token sent as the token query parameter. Sign in to Chat API and copy the token for your instance from the API access dashboard: https://chat-api.com/en/get-api.html#login.",
      extraFields: [
        {
          key: "instanceId",
          label: "Instance ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "123",
          description:
            "Your Chat API instance number used in API URLs such as https://api.chat-api.com/instance123/status.",
        },
      ],
    },
  ],
  homepageUrl: "https://chat-api.com/en/",
  actions: chatApiForWhatsappActions,
};
