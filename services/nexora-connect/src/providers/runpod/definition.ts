import type { ProviderDefinition } from "../../core/types.ts";

import { runpodActions } from "./actions.ts";

const service = "runpod";

export const provider: ProviderDefinition = {
  service,
  displayName: "Runpod",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "RUNPOD_API_KEY",
      description: "Runpod API key used with the Authorization Bearer header. Create it in Runpod Console API Keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.runpod.io",
  actions: runpodActions,
};
