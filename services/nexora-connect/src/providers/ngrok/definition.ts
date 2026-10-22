import type { ProviderDefinition } from "../../core/types.ts";

import { ngrokActions } from "./actions.ts";

const service = "ngrok";

/**
 * ngrok provider backed by the public ngrok Admin API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "ngrok",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ngrok_api_key",
      description:
        "ngrok Admin API key used with the Authorization Bearer header. Create your first key on the ngrok Dashboard API Keys page: https://dashboard.ngrok.com/api/keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://ngrok.com",
  actions: ngrokActions,
};
