import type { ProviderDefinition } from "../../core/types.ts";

import { sageSalesManagementActions } from "./actions.ts";

const service = "sage_sales_management";

export const provider: ProviderDefinition = {
  service,
  displayName: "Sage Sales Management",
  categories: ["Marketing"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "publicApiKey",
          label: "Public API Key",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "SAGE_SALES_MANAGEMENT_PUBLIC_API_KEY",
          description:
            "Sage Sales Management public API key used as the /login username. Admins can find API keys in Settings > Integrations > API key management in the web app or ForceAdmin.",
        },
        {
          key: "privateApiKey",
          label: "Private API Key",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "SAGE_SALES_MANAGEMENT_PRIVATE_API_KEY",
          description:
            "Sage Sales Management private API key used as the /login password. Admins can view or generate it in ForceAdmin API keys.",
        },
      ],
      testAction: {
        actionName: "list_accounts",
        input: {
          count: 1,
        },
      },
    },
  ],
  homepageUrl: "https://www.forcemanager.com/",
  actions: sageSalesManagementActions,
};
