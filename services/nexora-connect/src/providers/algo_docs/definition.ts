import type { ProviderDefinition } from "../../core/types.ts";

import { algoDocsActions } from "./actions.ts";

const service = "algo_docs";

export const provider: ProviderDefinition = {
  service,
  displayName: "AlgoDocs",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Secret API Key",
      placeholder: "ALGODOCS_API_KEY",
      description:
        "AlgoDocs secret API key sent with the x-api-key header. Create or view it from your AlgoDocs REST API settings page: https://app.algodocs.com/restapi.",
    },
  ],
  homepageUrl: "https://algodocs.com",
  actions: algoDocsActions,
};
