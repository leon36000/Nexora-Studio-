import type { ProviderDefinition } from "../../core/types.ts";

import { pushbulletActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "pushbullet",
  displayName: "Pushbullet",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "o.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      description:
        "Pushbullet access token sent with the Access-Token header. Find it in your Pushbullet Account Settings.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.pushbullet.com",
  actions: pushbulletActions,
};
