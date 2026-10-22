import type { ProviderDefinition } from "../../core/types.ts";

import { chartmogulActions } from "./actions.ts";

const service = "chartmogul";

/**
 * ChartMogul provider backed by the public REST API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "ChartMogul",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CHARTMOGUL_API_KEY",
      description:
        "ChartMogul API key used as the HTTP Basic Auth username with an empty password. Create or view API keys from Profile > View Profile > API Keys: https://help.chartmogul.com/article/95-creating-and-managing-api-keys.",
    },
  ],
  homepageUrl: "https://chartmogul.com/",
  actions: chartmogulActions,
};
