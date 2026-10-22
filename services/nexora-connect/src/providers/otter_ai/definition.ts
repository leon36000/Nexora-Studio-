import type { ProviderDefinition } from "../../core/types.ts";

import { otterAiActions } from "./actions.ts";

const service = "otter_ai";

export const provider: ProviderDefinition = {
  service,
  displayName: "Otter.ai",
  categories: ["AI", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "otter_api_key",
      description:
        "Otter.ai API key used as a bearer token. Create keys from Otter.ai Integrations > Developer after signing in.",
    },
  ],
  homepageUrl: "https://otter.ai",
  actions: otterAiActions,
};
