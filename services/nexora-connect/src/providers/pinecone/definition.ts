import type { ProviderDefinition } from "../../core/types.ts";

import { pineconeActions } from "./actions.ts";

const service = "pinecone";

export const provider: ProviderDefinition = {
  service,
  displayName: "Pinecone",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PINECONE_API_KEY",
      description:
        "Pinecone API key used with the Api-Key header. Create or view API keys in the Pinecone console: https://app.pinecone.io/organizations/-/projects.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.pinecone.io/",
  actions: pineconeActions,
};
