import type { ProviderDefinition } from "../../core/types.ts";

import { perplexityActions } from "./actions.ts";

const service = "perplexity";

export const provider: ProviderDefinition = {
  service,
  displayName: "Perplexity",
  categories: ["AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PPLX_API_KEY",
      description:
        "Perplexity API key used with the Authorization Bearer header. Generate it in Settings > </> API: https://www.perplexity.ai/help-center/en/articles/10352995-api-settings",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.perplexity.ai",
  actions: perplexityActions,
};
