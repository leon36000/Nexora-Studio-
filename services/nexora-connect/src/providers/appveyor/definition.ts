import type { ProviderDefinition } from "../../core/types.ts";

import { appveyorActions } from "./actions.ts";

const service = "appveyor";

export const provider: ProviderDefinition = {
  service,
  displayName: "AppVeyor",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "APPVEYOR_TOKEN",
      description:
        "AppVeyor API token used with the Authorization Bearer header. Find or create it on the AppVeyor API token page: https://ci.appveyor.com/api-keys.",
      extraFields: [
        {
          key: "accountName",
          label: "Account Name",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "my-appveyor-account",
          description:
            "Optional AppVeyor account name used to scope user-level API keys through /api/account/{accountName}. AppVeyor documents this requirement in the REST API authentication guide: https://www.appveyor.com/docs/api/.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.appveyor.com",
  actions: appveyorActions,
};
