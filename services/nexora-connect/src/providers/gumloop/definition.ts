import type { ProviderDefinition } from "../../core/types.ts";

import { gumloopActions } from "./actions.ts";

const service = "gumloop";

export const provider: ProviderDefinition = {
  service,
  displayName: "Gumloop",
  categories: ["AI", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "GUMLOOP_API_KEY",
      description:
        "Gumloop API key sent as a bearer token. Generate one from the Gumloop credentials page: https://www.gumloop.com/settings/profile/credentials.",
      extraFields: [
        {
          key: "userId",
          label: "User ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "GUMLOOP_USER_ID",
          description:
            "Gumloop user ID sent with the x-auth-key header for personal API keys. Find it in Profile Settings: https://www.gumloop.com/settings/profile/general.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.gumloop.com",
  actions: gumloopActions,
};
