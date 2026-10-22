import type { ProviderDefinition } from "../../core/types.ts";

import { instabotActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "instabot",
  displayName: "Instabot",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "INSTABOT_API_KEY",
      description: "Instabot API Key sent in the X-Instabot-Api-Key header. View it at https://app.instabot.io/.",
      extraFields: [
        {
          key: "masterApiKey",
          label: "Master API Key",
          required: true,
          secret: true,
          inputType: "password",
          placeholder: "INSTABOT_MASTER_API_KEY",
          description: "Instabot Master API Key used for administrative Server API access.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.instabot.io/",
  actions: instabotActions,
};
