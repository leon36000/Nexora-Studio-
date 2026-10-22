import type { ProviderDefinition } from "../../core/types.ts";

import { flexmailActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "flexmail",
  displayName: "Flexmail",
  categories: ["Marketing", "Communication"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "accountId",
          label: "Account ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "FLEXMAIL_ACCOUNT_ID",
          description:
            "Flexmail account ID used as the HTTP Basic Auth username. Find it in the Flexmail app Settings page.",
        },
        {
          key: "personalAccessToken",
          label: "Personal Access Token",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "FLEXMAIL_PERSONAL_ACCESS_TOKEN",
          description:
            "Flexmail personal access token used as the HTTP Basic Auth password. Create or view tokens in Settings > API > Personal access tokens: https://api.flexmail.eu/documentation/.",
        },
      ],
      testAction: {
        actionName: "list_contacts",
        input: {
          limit: 1,
        },
      },
    },
  ],
  homepageUrl: "https://flexmail.be/en",
  actions: flexmailActions,
};
