import type { ProviderDefinition } from "../../core/types.ts";

import { phonelyActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "phonely",
  displayName: "Phonely",
  categories: ["Communication", "AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PHONELY_API_KEY",
      description:
        "Phonely API key sent with the X-Authorization header. Copy it from profile settings: https://app.phonely.ai/settings?tab=profile.",
      extraFields: [
        {
          key: "userId",
          label: "User ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "PHONELY_USER_ID",
          description: "Phonely user ID required by the agent and call APIs.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.phonely.ai/",
  actions: phonelyActions,
};
