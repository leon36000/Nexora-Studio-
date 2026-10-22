import type { ProviderDefinition } from "../../core/types.ts";

import { templatedActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "templated",
  displayName: "Templated",
  categories: ["Design & Media", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "templated_api_key",
      description:
        "Templated API key used with the Authorization Bearer header. Find it in the API Key tab: https://app.templated.io/api-key.",
    },
  ],
  homepageUrl: "https://templated.io",
  actions: templatedActions,
};
