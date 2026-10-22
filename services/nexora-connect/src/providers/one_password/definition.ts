import type { ProviderDefinition } from "../../core/types.ts";

import { onePasswordActions } from "./actions.ts";

const service = "one_password";

export const provider: ProviderDefinition = {
  service,
  displayName: "1Password",
  categories: ["Security", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Connect Access Token",
      placeholder: "eyJ...",
      description:
        "1Password Connect access token sent with the Authorization: Bearer header. Create or copy it from your 1Password Connect Server setup: https://developer.1password.com/docs/connect/get-started.",
      extraFields: [
        {
          key: "baseUrl",
          label: "Connect Server URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://onepassword-connect.example.com",
          description:
            "The root URL of your 1Password Connect Server, such as https://onepassword-connect.example.com.",
        },
      ],
    },
  ],
  homepageUrl: "https://1password.com",
  actions: onePasswordActions,
};
