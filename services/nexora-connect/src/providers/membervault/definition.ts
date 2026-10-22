import type { ProviderDefinition } from "../../core/types.ts";

import { membervaultActions } from "./actions.ts";

const credentialHelpUrl = "https://intercom.help/membervault/en/articles/6868514-how-to-locate-your-account-s-api-key";

export const provider: ProviderDefinition = {
  service: "membervault",
  displayName: "MemberVault",
  categories: ["Marketing", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MEMBERVAULT_API_KEY",
      description: `MemberVault API key sent as the apikey query parameter. Find it in your MemberVault admin under Integrations > Other > Webhooks API: ${credentialHelpUrl}.`,
      extraFields: [
        {
          key: "accountUrl",
          label: "Account URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "your-account or https://your-account.mvsite.app",
          description:
            "Your MemberVault account subdomain or account URL. If you enter only the account name, the connector uses https://{account}.mvsite.app/api.",
        },
      ],
    },
  ],
  homepageUrl: "https://membervault.co/",
  actions: membervaultActions,
};
