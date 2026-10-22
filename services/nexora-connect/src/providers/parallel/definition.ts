import type { ProviderDefinition } from "../../core/types.ts";

import { parallelActions } from "./actions.ts";

const service = "parallel";

export const provider: ProviderDefinition = {
  service,
  displayName: "Parallel",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API key",
      placeholder: "PARALLEL_API_KEY",
      description: "Parallel API key sent in the x-api-key header. Create or view API keys in the Parallel platform.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://parallel.ai",
  actions: parallelActions,
};
