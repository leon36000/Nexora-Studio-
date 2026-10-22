import type { ProviderDefinition } from "../../core/types.ts";

import { ragieActions } from "./actions.ts";

const service = "ragie";

export const provider: ProviderDefinition = {
  service,
  displayName: "Ragie",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ragie_api_key",
      description:
        "Ragie API key used with the Authorization Bearer header. Create it by following the official guide at https://docs.ragie.ai/docs/step-1-create-an-api-key.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.ragie.ai",
  actions: ragieActions,
};
