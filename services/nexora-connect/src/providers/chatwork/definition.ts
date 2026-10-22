import type { ProviderDefinition } from "../../core/types.ts";

import { chatworkActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "chatwork",
  displayName: "Chatwork",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "chatwork_api_token",
      description:
        "Chatwork API token sent with the X-ChatWorkToken header. Generate it from the Chatwork API settings page.",
    },
  ],
  homepageUrl: "https://go.chatwork.com",
  actions: chatworkActions,
};
