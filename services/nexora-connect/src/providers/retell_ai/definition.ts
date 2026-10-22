import type { ProviderDefinition } from "../../core/types.ts";

import { retellAiActions } from "./actions.ts";

const service = "retell_ai";

export const provider: ProviderDefinition = {
  service,
  displayName: "Retell AI",
  categories: ["AI", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "RETELL_API_KEY",
      description:
        "Retell AI API key sent in the Authorization Bearer header. Create and manage API keys in the Retell dashboard Settings > API Keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.retellai.com/",
  actions: retellAiActions,
};
