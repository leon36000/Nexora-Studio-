import type { ProviderDefinition } from "../../core/types.ts";

import { simplybookMeActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "simplybook_me",
  displayName: "SimplyBook.me",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "simplybook_me_api_key",
      description:
        "SimplyBook.me API key used with the company login to request JSON-RPC access tokens. Enable the API Custom Feature and find keys in its Settings: https://help.simplybook.me/index.php/API_custom_feature.",
      extraFields: [
        {
          key: "companyLogin",
          label: "Company Login",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "your-company-login",
          description: "The SimplyBook.me company login passed to getToken and X-Company-Login for API calls.",
        },
      ],
    },
  ],
  homepageUrl: "https://simplybook.me/",
  actions: simplybookMeActions,
};
