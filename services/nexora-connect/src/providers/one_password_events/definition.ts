import type { ProviderDefinition } from "../../core/types.ts";

import { onePasswordEventsActions } from "./actions.ts";

const service = "one_password_events";

export const provider: ProviderDefinition = {
  service,
  displayName: "1Password Events API",
  categories: ["Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Events API Bearer Token",
      placeholder: "ops_...",
      description:
        "1Password Events Reporting bearer token sent with the Authorization: Bearer header. Create an Events Reporting integration in 1Password and copy its bearer token.",
      extraFields: [
        {
          key: "baseUrl",
          label: "Events API Server URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://events.1password.com",
          description: "The Events API Server URL shown when you create the 1Password Events Reporting integration.",
        },
      ],
    },
  ],
  homepageUrl: "https://1password.com",
  actions: onePasswordEventsActions,
};
