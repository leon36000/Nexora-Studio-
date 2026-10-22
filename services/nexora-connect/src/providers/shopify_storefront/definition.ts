import type { ProviderDefinition } from "../../core/types.ts";

import { shopifyStorefrontActions } from "./actions.ts";

const service = "shopify_storefront";

export const provider: ProviderDefinition = {
  service,
  displayName: "Shopify Storefront",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Storefront access token",
      placeholder: "shpat_... or public Storefront token",
      description:
        "Shopify Storefront access token sent with the X-Shopify-Storefront-Access-Token header. Create or copy a Storefront API token from a Shopify custom app or public app setup: https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/getting-started",
      extraFields: [
        {
          key: "shopDomain",
          label: "Shop domain",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "acme.myshopify.com",
          description:
            "The store's myshopify.com domain, such as acme.myshopify.com. A Shopify storefront or admin URL for the same shop is also accepted.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.shopify.com",
  actions: shopifyStorefrontActions,
};
