import type { ProviderDefinition } from "../../core/types.ts";

import { zepActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "zep",
  displayName: "Zep",
  description: "Manage Zep users, conversation threads, messages, and graph context.",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_ZEP_API_KEY",
      description:
        "Zep API key sent as Authorization: Api-Key <api_key>. Create or copy a key from your Zep project's settings after signing in at https://app.getzep.com.",
    },
  ],
  homepageUrl: "https://www.getzep.com",
  actions: zepActions,
};
