import type { ProviderDefinition } from "../../core/types.ts";

import { blueskyActions } from "./actions.ts";

const service = "bluesky";

export const provider: ProviderDefinition = {
  service,
  displayName: "Bluesky",
  categories: ["Social", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "App Password",
      placeholder: "xxxx-xxxx-xxxx-xxxx",
      description:
        "Bluesky app password used to create an AT Protocol session. Create an app password in Bluesky Settings > Privacy and Security > App Passwords: https://bsky.app/settings/app-passwords",
      extraFields: [
        {
          key: "handle",
          label: "Handle",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "alice.bsky.social",
          description:
            "Bluesky handle or DID used with the app password. Find your handle on your Bluesky profile or account settings: https://bsky.app/settings/account",
        },
      ],
    },
  ],
  homepageUrl: "https://bsky.social",
  actions: blueskyActions,
};
