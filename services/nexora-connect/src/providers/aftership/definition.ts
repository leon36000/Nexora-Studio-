import type { ProviderDefinition } from "../../core/types.ts";

import { aftershipActions } from "./actions.ts";

const service = "aftership";

export const provider: ProviderDefinition = {
  service,
  displayName: "AfterShip",
  categories: ["Productivity", "Location"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "AFTERSHIP_API_KEY",
      description:
        "AfterShip API key used with the as-api-key header. Create or manage API keys in AfterShip organization settings: https://admin.aftership.com/settings/api-keys.",
    },
  ],
  homepageUrl: "https://www.aftership.com/",
  actions: aftershipActions,
};
