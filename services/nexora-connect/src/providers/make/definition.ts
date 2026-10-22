import type { ProviderDefinition } from "../../core/types.ts";

import { makeActions } from "./actions.ts";

const service = "make";

export const provider: ProviderDefinition = {
  service,
  displayName: "Make",
  categories: ["Productivity", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "12345678-12ef-abcd-1234-1234567890ab",
      description:
        "Make API token used with the Authorization: Token header. Create or manage API tokens in your Make profile: https://developers.make.com/api-documentation/authentication/create-authentication-token.",
      extraFields: [
        {
          key: "zoneUrl",
          label: "Zone URL",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "https://eu1.make.com",
          description:
            "The official Make zone URL for your organization, such as https://eu1.make.com or https://us1.make.com. Copy it from your Make organization dashboard URL.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.make.com",
  actions: makeActions,
};
