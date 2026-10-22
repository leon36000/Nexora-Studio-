import type { ProviderDefinition } from "../../core/types.ts";

import { sliteActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "slite",
  displayName: "Slite",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SLITE_API_KEY",
      description:
        "Slite API key sent with the x-slite-api-key header. Generate it in Slite under Settings > API by following the public API docs: https://developers.slite.com/docs/getting-started",
    },
  ],
  homepageUrl: "https://slite.com",
  actions: sliteActions,
};
