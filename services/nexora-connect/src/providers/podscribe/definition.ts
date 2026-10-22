import type { ProviderDefinition } from "../../core/types.ts";

import { podscribeActions } from "./actions.ts";

const service = "podscribe";

export const provider: ProviderDefinition = {
  service,
  displayName: "Podscribe",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PODSCRIBE_API_KEY",
      description: "Podscribe API key sent as a Bearer token. Podscribe provides keys for public API access.",
    },
  ],
  homepageUrl: "https://podscribe.com",
  actions: podscribeActions,
};
