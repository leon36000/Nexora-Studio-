import type { ProviderDefinition } from "../../core/types.ts";

import { serverAvatarActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "serveravatar",
  displayName: "ServerAvatar",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "SERVERAVATAR_API_TOKEN",
      description:
        "ServerAvatar API token sent with the Authorization: Bearer header. Enable API access and copy the token from Account > Manage: https://serveravatar.com/introducing-serveravatar-api/.",
    },
  ],
  homepageUrl: "https://serveravatar.com/",
  actions: serverAvatarActions,
};
