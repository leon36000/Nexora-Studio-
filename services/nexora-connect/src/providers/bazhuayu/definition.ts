import type { ProviderDefinition } from "../../core/types.ts";

import { bazhuayuActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "bazhuayu",
  displayName: "Bazhuayu",
  description: "Run and manage Bazhuayu web data collection tasks.",
  categories: ["Data", "Developer Tools"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "username",
          label: "Bazhuayu Account",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "Username, email, or phone number",
          description: "The Bazhuayu username, email address, or phone number used to obtain an API access token.",
        },
        {
          key: "password",
          label: "Bazhuayu Password",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "Your Bazhuayu account password",
          description: "The password used to obtain and renew a Bazhuayu API access token.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.bazhuayu.com/",
  actions: bazhuayuActions,
};
