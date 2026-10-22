import type { ProviderDefinition } from "../../core/types.ts";

import { tripleWhaleActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "triple_whale",
  displayName: "Triple Whale",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TRIPLE_WHALE_API_KEY",
      description:
        "Triple Whale API key sent with the x-api-key header. Generate it from Data > APIs in the Triple Whale app: https://app.triplewhale.com/api-keys",
    },
  ],
  homepageUrl: "https://www.triplewhale.com",
  actions: tripleWhaleActions,
};
