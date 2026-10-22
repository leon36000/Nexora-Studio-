import type { ProviderDefinition } from "../../core/types.ts";

import { rocketChatActions } from "./actions.ts";

const service = "rocket_chat";

export const provider: ProviderDefinition = {
  service,
  displayName: "Rocket.Chat",
  categories: ["Communication", "Productivity"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "baseUrl",
          label: "Workspace URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://chat.example.com",
          description:
            "Rocket.Chat workspace URL used as the REST API host. Use the HTTPS URL where your workspace is hosted.",
        },
        {
          key: "userId",
          label: "User ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "rbAXPnMktTFbNpwtJ",
          description: "Rocket.Chat user ID sent with the X-User-Id header.",
        },
        {
          key: "authToken",
          label: "Auth Token",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "RScctEHSmLGZGywf...",
          description:
            "Rocket.Chat auth token sent with the X-Auth-Token header. Generate a personal access token in Rocket.Chat user preferences or obtain it from the login API.",
        },
      ],
      testAction: {
        actionName: "get_me",
        input: {},
      },
    },
  ],
  homepageUrl: "https://www.rocket.chat",
  actions: rocketChatActions,
};
