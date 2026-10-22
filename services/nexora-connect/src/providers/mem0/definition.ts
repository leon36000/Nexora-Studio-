import type { ProviderDefinition } from "../../core/types.ts";

import { mem0Actions } from "./actions.ts";

const service = "mem0";

/**
 * Mem0 provider backed by the Mem0 REST API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "Mem0",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "m0-...",
      description:
        "Mem0 API key used with Authorization: Token <api_key>. Get it from your Mem0 dashboard: https://docs.mem0.ai/platform/quickstart",
    },
  ],
  homepageUrl: "https://mem0.ai",
  actions: mem0Actions,
};
