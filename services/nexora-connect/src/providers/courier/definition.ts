import type { ProviderDefinition } from "../../core/types.ts";

import { courierActions } from "./actions.ts";

const service = "courier";

export const provider: ProviderDefinition = {
  service,
  displayName: "Courier",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "COURIER_API_KEY",
      description:
        "Courier API key used with the Authorization Bearer header. Create or manage keys in the Courier dashboard API Keys page: https://app.courier.com/settings/api-keys.",
    },
  ],
  homepageUrl: "https://www.courier.com",
  actions: courierActions,
};
