import type { ProviderDefinition } from "../../core/types.ts";

import { tokenMetricsActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "token_metrics",
  displayName: "Token Metrics",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TOKEN_METRICS_API_KEY",
      description:
        "Token Metrics API key sent with the x-api-key header. Create or view API keys at https://app.tokenmetrics.com/en/api; authentication is documented at https://developers.tokenmetrics.com/docs/authentication.",
    },
  ],
  homepageUrl: "https://www.tokenmetrics.com/",
  actions: tokenMetricsActions,
};
