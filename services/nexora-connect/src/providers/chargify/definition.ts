import type { ProviderDefinition } from "../../core/types.ts";

import { chargifyActions } from "./actions.ts";
export const provider: ProviderDefinition = {
  service: "chargify",
  displayName: "Maxio Advanced Billing",
  categories: ["Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MAXIO_API_KEY",
      description:
        "Maxio Advanced Billing API key. Create one under Config > Integrations > API Keys: https://docs.maxio.com/hc/en-us/articles/24294819360525-Advanced-Billing-API-Keys",
      extraFields: [
        {
          key: "siteUrl",
          label: "Site URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://acme.chargify.com",
          description: "Your full Advanced Billing site URL.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.maxio.com/product/advanced-billing",
  actions: chargifyActions,
};
