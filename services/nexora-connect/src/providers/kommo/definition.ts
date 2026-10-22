import type { ProviderDefinition } from "../../core/types.ts";

import { kommoActions } from "./actions.ts";

const service = "kommo";
const kommoCredentialHelpUrl = "https://developers.kommo.com/docs/long-lived-token";
const kommoPrivateIntegrationHelpUrl = "https://developers.kommo.com/docs/private-integration";

export const provider: ProviderDefinition = {
  service,
  displayName: "Kommo",
  categories: ["Marketing", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Long-lived Token",
      placeholder: "KOMMO_LONG_LIVED_TOKEN",
      description: `Kommo long-lived token used as a Bearer token for a private integration. Create a private integration and generate the token from its Keys and scopes tab: ${kommoCredentialHelpUrl}.`,
      extraFields: [
        {
          key: "subdomain",
          label: "Subdomain",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "acme",
          description: `Your Kommo account subdomain used to build https://<subdomain>.kommo.com requests. You can enter the subdomain or full account URL; private integration setup is documented at ${kommoPrivateIntegrationHelpUrl}.`,
        },
      ],
    },
  ],
  homepageUrl: "https://www.kommo.com/",
  actions: kommoActions,
};
