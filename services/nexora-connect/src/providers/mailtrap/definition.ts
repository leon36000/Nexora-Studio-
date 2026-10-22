import type { ProviderDefinition } from "../../core/types.ts";

import { mailtrapActions } from "./actions.ts";

const service = "mailtrap";

export const provider: ProviderDefinition = {
  service,
  displayName: "Mailtrap",
  categories: ["Communication", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "MAILTRAP_API_TOKEN",
      description:
        "Mailtrap API token used with the Authorization Bearer header. Create or manage tokens in Mailtrap Settings > API Tokens: https://docs.mailtrap.io/email-api-smtp/setup/api-tokens/.",
      extraFields: [
        {
          key: "accountId",
          label: "Account ID",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "26730",
          description:
            "Optional default Mailtrap account ID for account-scoped actions. You can find it in Account Settings or through the Accounts API.",
        },
      ],
    },
  ],
  homepageUrl: "https://mailtrap.io/",
  actions: mailtrapActions,
};
