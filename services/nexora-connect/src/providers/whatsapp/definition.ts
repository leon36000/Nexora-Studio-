import type { ProviderDefinition } from "../../core/types.ts";

import { whatsappActions } from "./actions.ts";

const service = "whatsapp";

export const provider: ProviderDefinition = {
  service,
  displayName: "WhatsApp",
  categories: ["Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "EAAG...",
      description:
        "Meta access token used with the Authorization Bearer header. Generate a permanent token from the official WhatsApp Cloud API getting started guide and Meta Business Settings: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started and https://business.facebook.com/latest/settings . The token should include WhatsApp Business messaging and management permissions.",
      extraFields: [
        {
          key: "wabaId",
          label: "Default WABA ID",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "123456789012345",
          description: "Optional default WhatsApp Business Account ID reused by phone-number and template actions.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.whatsapp.com",
  actions: whatsappActions,
};
