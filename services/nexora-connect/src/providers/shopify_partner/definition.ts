import type { ProviderDefinition } from "../../core/types.ts";

import { shopifyPartnerActions } from "./actions.ts";

const service = "shopify_partner";

export const provider: ProviderDefinition = {
  service,
  displayName: "Shopify Partner",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Partner API access token",
      placeholder: "partner_api_access_token",
      description:
        "Shopify Partner API client access token sent with the X-Shopify-Access-Token header. Create it in Partners Dashboard settings: https://shopify.dev/docs/api/partner/latest#create-a-partner-api-client",
      extraFields: [
        {
          key: "organizationId",
          label: "Organization ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "1234567",
          description:
            "The Shopify Partner organization ID from the Partners Dashboard URL, used in the Partner API endpoint.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.shopify.com/partners",
  actions: shopifyPartnerActions,
};
