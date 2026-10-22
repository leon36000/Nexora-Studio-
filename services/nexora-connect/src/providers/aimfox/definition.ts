import type { ProviderDefinition } from "../../core/types.ts";

import { aimfoxActions } from "./actions.ts";

const service = "aimfox";

export const provider: ProviderDefinition = {
  service,
  displayName: "Aimfox",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "aimfox_api_key",
      description:
        "Aimfox API key sent with the Authorization Bearer header. Create it from Workspace Settings > Integrations in your Aimfox dashboard: https://docs.aimfox.com/.",
    },
  ],
  homepageUrl: "https://aimfox.com",
  actions: aimfoxActions,
};
