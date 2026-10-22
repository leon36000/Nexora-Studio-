import type { ProviderDefinition } from "../../core/types.ts";

import { contentstackContentDeliveryActions } from "./actions.ts";

const service = "contentstack_content_delivery";

export const provider: ProviderDefinition = {
  service,
  displayName: "Contentstack Content Delivery",
  categories: ["Data", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Stack API Key",
      placeholder: "CONTENTSTACK_STACK_API_KEY",
      description:
        "Contentstack stack API key sent with the api_key header. Find it with the Delivery Token in your stack under Settings > Tokens > Delivery Tokens: https://www.contentstack.com/docs/developers/create-tokens/about-delivery-tokens",
      extraFields: [
        {
          key: "deliveryToken",
          label: "Delivery Token",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "CONTENTSTACK_DELIVERY_TOKEN",
          description:
            "Contentstack Delivery Token sent with the access_token header for published content. Create or view it under Settings > Tokens > Delivery Tokens: https://www.contentstack.com/docs/developers/create-tokens/create-a-delivery-token",
        },
        {
          key: "branch",
          label: "Branch UID",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "main",
          description: "Optional Contentstack branch UID sent with the branch header when your stack uses branches.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.contentstack.com/",
  actions: contentstackContentDeliveryActions,
};
