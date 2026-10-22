import type { ProviderDefinition } from "../../core/types.ts";

import { twochatActions } from "./actions.ts";

const service = "twochat";

export const provider: ProviderDefinition = {
  service,
  displayName: "2Chat",
  categories: ["Communication", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_2CHAT_API_KEY",
      description:
        "2Chat API key sent with the X-User-API-Key header. Create or view it from the API Access tab in the 2Chat dashboard: https://app.2chat.io/developers?tab=api-access.",
    },
  ],
  homepageUrl: "https://2chat.co",
  actions: twochatActions,
};
