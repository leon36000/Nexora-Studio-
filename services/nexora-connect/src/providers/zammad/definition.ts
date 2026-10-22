import type { ProviderDefinition } from "../../core/types.ts";

import { zammadActions } from "./actions.ts";
export const provider: ProviderDefinition = {
  service: "zammad",
  displayName: "Zammad",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "Your Zammad access token",
      description:
        "Create a token in your Zammad user profile under Token Access: https://user-docs.zammad.org/en/latest/extras/user-menu-profile-settings.html#token-access.",
      extraFields: [
        {
          key: "baseUrl",
          label: "Zammad Base URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://support.example.com",
        },
      ],
    },
  ],
  homepageUrl: "https://zammad.com/en",
  actions: zammadActions,
};
