import type { ProviderDefinition } from "../../core/types.ts";

import { simpleAnalyticsActions } from "./actions.ts";

const service = "simple_analytics";

export const provider: ProviderDefinition = {
  service,
  displayName: "Simple Analytics",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "sa_api_key_...",
      description:
        "Simple Analytics API key used with the Api-Key header. Create it in your account settings: https://docs.simpleanalytics.com/api/authenticate.",
      extraFields: [
        {
          key: "userId",
          label: "User ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "sa_user_id_...",
          description:
            "Simple Analytics user ID required for Admin API and Export API requests. It is shown in your account settings: https://docs.simpleanalytics.com/api/authenticate.",
        },
      ],
    },
  ],
  homepageUrl: "https://simpleanalytics.com",
  actions: simpleAnalyticsActions,
};
