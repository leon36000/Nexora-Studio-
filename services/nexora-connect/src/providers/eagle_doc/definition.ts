import type { ProviderDefinition } from "../../core/types.ts";

import { eagleDocActions } from "./actions.ts";

const service = "eagle_doc";

export const provider: ProviderDefinition = {
  service,
  displayName: "Eagle Doc",
  categories: ["AI", "Finance", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "EAGLE_DOC_API_KEY",
      description:
        "Eagle Doc API key sent with the api-key header. Subscribe and sign in to the Eagle Doc API dashboard to copy it.",
    },
  ],
  homepageUrl: "https://www.eagle-doc.com/en/products/eagle-doc-apis/",
  actions: eagleDocActions,
};
