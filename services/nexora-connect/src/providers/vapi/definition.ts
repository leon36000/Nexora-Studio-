import type { ProviderDefinition } from "../../core/types.ts";

import { vapiActions } from "./actions.ts";

const service = "vapi";

export const provider: ProviderDefinition = {
  service,
  displayName: "Vapi",
  categories: ["AI", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "vapi_api_key",
      description: "Vapi API key used with the Authorization Bearer header.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://vapi.ai",
  actions: vapiActions,
};
