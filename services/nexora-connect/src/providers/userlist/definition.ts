import type { ProviderDefinition } from "../../core/types.ts";

import { userlistActions } from "./actions.ts";

const service = "userlist";

export const provider: ProviderDefinition = {
  service,
  displayName: "Userlist",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Push API Key",
      placeholder: "USERLIST_PUSH_KEY",
      description:
        "Userlist Push API key used with the Authorization: Push <key> header. Copy it from Push Settings in your Userlist account: https://app.userlist.com/settings/push.",
    },
  ],
  homepageUrl: "https://userlist.com",
  actions: userlistActions,
};
