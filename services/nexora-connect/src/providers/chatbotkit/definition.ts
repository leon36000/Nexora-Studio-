import type { ProviderDefinition } from "../../core/types.ts";

import { chatbotkitActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "chatbotkit",
  displayName: "ChatBotKit",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "chatbotkit_api_key",
      description:
        "ChatBotKit API key used with the Authorization Bearer header. Generate it from your ChatBotKit account tokens page: https://chatbotkit.com/tokens.",
    },
  ],
  homepageUrl: "https://chatbotkit.com",
  actions: chatbotkitActions,
};
