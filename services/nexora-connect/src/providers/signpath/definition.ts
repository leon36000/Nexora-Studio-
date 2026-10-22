import type { ProviderDefinition } from "../../core/types.ts";

import { signpathActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "signpath",
  displayName: "SignPath",
  categories: ["Developer Tools", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "signpath_api_token",
      description:
        "SignPath API token sent with the Authorization Bearer header. Generate it from your personal settings or a CI user account as documented at https://docs.signpath.io/users#interactive-api-token.",
      extraFields: [
        {
          key: "organizationId",
          label: "Organization ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "094f5736-6b8c-4ca7-9514-0933c8b928e2",
          description:
            "The SignPath organization ID inserted into every API path. Find it on your organization page, as noted in the official users guide: https://docs.signpath.io/users#support.",
        },
      ],
    },
  ],
  homepageUrl: "https://signpath.io/",
  actions: signpathActions,
};
