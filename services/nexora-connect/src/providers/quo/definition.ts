import type { ProviderDefinition } from "../../core/types.ts";

import { quoActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "quo",
  displayName: "Quo (OpenPhone)",
  categories: ["Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "QUO_API_KEY",
      description:
        "Quo API key sent with the Authorization header. Generate it from the API tab in Quo workspace settings: https://www.quo.com/docs/mdx/api-reference/authentication.md.",
    },
  ],
  homepageUrl: "https://www.quo.com",
  actions: quoActions,
};
