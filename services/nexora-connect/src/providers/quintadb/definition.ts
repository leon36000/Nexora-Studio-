import type { ProviderDefinition } from "../../core/types.ts";

import { quintaDbActions } from "./actions.ts";

const service = "quintadb";

export const provider: ProviderDefinition = {
  service,
  displayName: "QuintaDB",
  categories: ["Data", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "REST API Key",
      placeholder: "QUINTADB_REST_API_KEY",
      description:
        "QuintaDB REST API key sent as the rest_api_key query parameter. Find it from the API menu in your QuintaDB account: https://quintadb.com/rest_apis.",
    },
  ],
  homepageUrl: "https://quintadb.com",
  actions: quintaDbActions,
};
