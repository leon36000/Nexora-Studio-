import type { ProviderDefinition } from "../../core/types.ts";

import { precoroActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "precoro",
  displayName: "Precoro",
  categories: ["Finance", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "X-AUTH-TOKEN",
      placeholder: "PRECORO_X_AUTH_TOKEN",
      description:
        "Precoro company API token sent with the X-AUTH-TOKEN header. Generate it under Configuration > Integrations > API Key: https://help.precoro.com/using-api-in-precoro.",
      extraFields: [
        {
          key: "email",
          label: "User Email",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "user@company.com",
          description:
            "Precoro user email sent with the email header alongside X-AUTH-TOKEN. Use the email of the Precoro user that generated or is allowed to use the API key.",
        },
        {
          key: "region",
          label: "API Region",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "com",
          description:
            "Precoro API region derived from your app URL. Use com for app.precoro.com and us for app.precoro.us.",
        },
      ],
    },
  ],
  homepageUrl: "https://precoro.com/",
  actions: precoroActions,
};
