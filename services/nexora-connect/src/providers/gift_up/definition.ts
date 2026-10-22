import type { ProviderDefinition } from "../../core/types.ts";

import { giftUpActions } from "./actions.ts";

const service = "gift_up";

/**
 * Gift Up gift card and order management provider.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Gift Up",
  categories: ["Finance", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "GIFT_UP_API_KEY",
      description:
        "Gift Up API key sent as a Bearer token in the Authorization header. Create or view API keys in the Gift Up dashboard: https://giftup.app/integrations/api-keys.",
    },
  ],
  homepageUrl: "https://www.giftup.com/",
  actions: giftUpActions,
};
