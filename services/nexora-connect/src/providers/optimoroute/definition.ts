import type { ProviderDefinition } from "../../core/types.ts";

import { optimorouteActions } from "./actions.ts";

const service = "optimoroute";

/**
 * OptimoRoute provider backed by Web Service API keys.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "OptimoRoute",
  categories: ["Location", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "OPTIMOROUTE_API_KEY",
      description:
        "OptimoRoute API key passed with the key query parameter. Enable Web Service API and copy the generated key in Administration > Settings > WS API: https://optimoroute.com/api/",
      extraFields: [],
    },
  ],
  homepageUrl: "https://optimoroute.com/",
  actions: optimorouteActions,
};
