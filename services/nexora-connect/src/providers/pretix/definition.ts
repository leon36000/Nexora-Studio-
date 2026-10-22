import type { ProviderDefinition } from "../../core/types.ts";

import { pretixActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "pretix",
  displayName: "pretix",
  categories: ["Productivity", "Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "pretix team API token",
      description:
        "Team-level pretix API token sent in the Authorization header. Create one below the team member list in your organizer settings: https://docs.pretix.eu/dev/api/tokenauth.html.",
      extraFields: [
        {
          key: "baseUrl",
          label: "pretix Base URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://pretix.eu",
          description:
            "The public HTTPS root URL of pretix Hosted or your self-hosted pretix instance, such as https://pretix.eu or https://tickets.example.com.",
        },
      ],
    },
  ],
  homepageUrl: "https://pretix.eu",
  actions: pretixActions,
};
