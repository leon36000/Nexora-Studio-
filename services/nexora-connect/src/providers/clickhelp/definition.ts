import type { ProviderDefinition } from "../../core/types.ts";

import { clickhelpActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "clickhelp",
  displayName: "ClickHelp",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CLICKHELP_API_KEY",
      description:
        "ClickHelp API key used as the HTTP Basic password. Generate it from My Profile: https://docs.clickhelp.com/articles/clickhelp-user-manual/get-api-key/.",
      extraFields: [
        {
          key: "login",
          label: "Login",
          required: true,
          secret: false,
          inputType: "text",
          placeholder: "your-login",
          description: "The ClickHelp Contributor login shown in My Profile.",
        },
        {
          key: "portalUrl",
          label: "Portal URL",
          required: true,
          secret: false,
          inputType: "text",
          placeholder: "https://your-portal.clickhelp.co",
          description: "The public HTTPS root URL of your ClickHelp portal.",
        },
      ],
    },
  ],
  homepageUrl: "https://clickhelp.com",
  actions: clickhelpActions,
};
