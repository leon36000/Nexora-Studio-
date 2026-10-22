import type { ProviderDefinition } from "../../core/types.ts";

import { semanticScholarActions } from "./actions.ts";

const service = "semantic_scholar";

export const provider: ProviderDefinition = {
  service,
  displayName: "Semantic Scholar",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SEMANTIC_SCHOLAR_API_KEY",
      description:
        "Semantic Scholar API key sent in the x-api-key header. Request a key from the official API page: https://www.semanticscholar.org/product/api#api-key-form.",
    },
  ],
  homepageUrl: "https://www.semanticscholar.org/",
  actions: semanticScholarActions,
};
