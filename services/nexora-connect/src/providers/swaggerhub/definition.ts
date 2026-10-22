import type { ProviderDefinition } from "../../core/types.ts";

import { swaggerhubActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "swaggerhub",
  displayName: "SwaggerHub",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "swaggerhub_api_key",
      description:
        "SwaggerHub personal API key sent in the Authorization header without a Bearer prefix. Find it in SwaggerHub account settings.",
    },
  ],
  homepageUrl: "https://swagger.io/tools/swaggerhub/",
  actions: swaggerhubActions,
};
