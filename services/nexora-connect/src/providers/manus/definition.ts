import type { ProviderDefinition } from "../../core/types.ts";

import { manusActions } from "./actions.ts";

const service = "manus";

export const provider: ProviderDefinition = {
  service,
  displayName: "Manus",
  categories: ["AI", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MANUS_API_KEY",
      description:
        "Manus API key sent with the x-manus-api-key header. Create and copy a key from Manus API Integration settings: https://manus.im/app?show_settings=integrations&app_name=api.",
    },
  ],
  homepageUrl: "https://manus.im",
  actions: manusActions,
};
