import type { ProviderDefinition } from "../../core/types.ts";

import { anrokActions } from "./actions.ts";

const service = "anrok";

export const provider: ProviderDefinition = {
  service,
  displayName: "Anrok",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "sxxx/saxxx/secret.xxx",
      description:
        "Anrok API key sent with the Authorization Bearer header. Create or view API keys in Anrok: https://app.anrok.com/-/api-keys.",
    },
  ],
  homepageUrl: "https://www.anrok.com",
  actions: anrokActions,
};
