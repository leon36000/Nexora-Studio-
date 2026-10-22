import type { ProviderDefinition } from "../../core/types.ts";

import { pushoverActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "pushover",
  displayName: "Pushover",
  categories: ["Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Application API Token",
      placeholder: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p",
      description:
        "Pushover application API token sent as the token parameter for application, message, group, and glance requests.",
      extraFields: [
        {
          key: "teamToken",
          label: "Team API Token",
          inputType: "password",
          required: false,
          secret: true,
          placeholder: "team_api_token",
          description:
            "Optional Team API token used for Teams and licensing actions when the action input does not override token.",
        },
      ],
    },
  ],
  homepageUrl: "https://pushover.net",
  actions: pushoverActions,
};
