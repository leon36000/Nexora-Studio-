import type { ProviderDefinition } from "../../core/types.ts";

import { document360Actions } from "./actions.ts";

const service = "document360";

export const provider: ProviderDefinition = {
  service,
  displayName: "Document360",
  categories: ["Productivity", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "DOCUMENT360_API_TOKEN",
      description:
        "Document360 API token passed in the api_token header. Create it in your Document360 knowledge base portal under API tokens.",
    },
  ],
  homepageUrl: "https://document360.com",
  actions: document360Actions,
};
