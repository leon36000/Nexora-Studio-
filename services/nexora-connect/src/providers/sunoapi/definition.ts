import type { ProviderDefinition } from "../../core/types.ts";

import { sunoapiActions } from "./actions.ts";

const service = "sunoapi";

export const provider: ProviderDefinition = {
  service,
  displayName: "SunoAPI",
  categories: ["AI", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "sunoapi_api_key",
      description:
        "SunoAPI API key used with the Authorization Bearer header. Create or copy it from the API Key Management page: https://sunoapi.org/api-key.",
    },
  ],
  homepageUrl: "https://sunoapi.org",
  actions: sunoapiActions,
};
