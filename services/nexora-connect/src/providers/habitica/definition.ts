import type { ProviderDefinition } from "../../core/types.ts";

import { habiticaActions } from "./actions.ts";

const service = "habitica";

export const provider: ProviderDefinition = {
  service,
  displayName: "Habitica",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "HABITICA_API_TOKEN",
      description:
        "Habitica API Token sent with the x-api-key header for authenticated API v3 requests. Find or reset it in Settings > API after signing in, then follow the official API docs: https://habitica.com/apidoc/",
      extraFields: [
        {
          key: "userId",
          label: "User ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          description:
            "Habitica User ID sent with the x-api-user header. Copy it from Settings > API in your Habitica account, alongside the API Token: https://habitica.com/apidoc/",
        },
        {
          key: "xClient",
          label: "X-Client Header",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "<habitica_user_id>-oomol-connect",
          description:
            "The exact X-Client header value required by Habitica for third-party tools. Follow the official API usage guideline format <creator Habitica UserID>-<appname>: https://github.com/HabitRPG/habitica/wiki/API-Usage-Guidelines",
        },
      ],
    },
  ],
  homepageUrl: "https://habitica.com",
  actions: habiticaActions,
};
