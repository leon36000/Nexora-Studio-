import type { ProviderDefinition } from "../../core/types.ts";

import { lemonSqueezyActions } from "./actions.ts";

const service = "lemon_squeezy";

/**
 * Lemon Squeezy provider backed by the public Lemon Squeezy API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Lemon Squeezy",
  categories: ["Productivity", "Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "lsq_...",
      description:
        "Lemon Squeezy API key used with the Authorization Bearer header. Create it in Settings > API: https://docs.lemonsqueezy.com/guides/developer-guide/getting-started",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.lemonsqueezy.com",
  actions: lemonSqueezyActions,
};
