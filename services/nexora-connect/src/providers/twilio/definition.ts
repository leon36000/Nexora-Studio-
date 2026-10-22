import type { ProviderDefinition } from "../../core/types.ts";

import { twilioActions } from "./actions.ts";

const service = "twilio";

export const provider: ProviderDefinition = {
  service,
  displayName: "Twilio",
  categories: ["Communication"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "accountSid",
          label: "Account SID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "AC...",
          description:
            "Twilio Account SID used as the account identifier in API paths. Find it in the Account Info section of https://www.twilio.com/console.",
        },
        {
          key: "authToken",
          label: "Auth Token",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "your_auth_token",
          description:
            "Twilio Auth Token used with the Authorization Basic header. Find or rotate it in the Account Info section of https://www.twilio.com/console.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.twilio.com",
  actions: twilioActions,
};
