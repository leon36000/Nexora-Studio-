import type { ProviderDefinition } from "../../core/types.ts";

import { autobloggerActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "autoblogger",
  displayName: "Autoblogging.ai",
  categories: ["Marketing", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "AUTOBLOGGING_AI_API_KEY",
      description:
        "Autoblogging.ai API key sent in the JSON request body. Manage keys in the API Keys section of your Autoblogging.ai dashboard: https://dash.autoblogging.ai/",
      extraFields: [
        {
          key: "dashboardEmail",
          label: "Dashboard Email",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "you@example.com",
          description:
            "The email address for your Autoblogging.ai dashboard account. It is required with the API key for every official API request: https://autoblogging.ai/api-documentation/",
        },
      ],
    },
  ],
  homepageUrl: "https://autoblogging.ai",
  actions: autobloggerActions,
};
