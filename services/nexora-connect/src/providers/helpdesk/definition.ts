import type { ProviderDefinition } from "../../core/types.ts";

import { helpdeskActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "helpdesk",
  displayName: "HelpDesk",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "HELPDESK_PERSONAL_ACCESS_TOKEN",
      description:
        "HelpDesk Personal Access Token used as the HTTP Basic Auth password. Create one under Tools > Personal Access Tokens in the Developers Console: https://developers.livechat.com/console/.",
      extraFields: [
        {
          key: "accountId",
          label: "Account ID",
          required: true,
          secret: false,
          inputType: "text",
          placeholder: "HELPDESK_ACCOUNT_ID",
          description: "HelpDesk account ID used as the HTTP Basic Auth username.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.helpdesk.com",
  actions: helpdeskActions,
};
