import type { ProviderDefinition } from "../../core/types.ts";

import { readwiseActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "readwise",
  displayName: "Readwise",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "READWISE_ACCESS_TOKEN",
      description:
        "Readwise access token used with the Authorization: Token <token> header. Copy it from the Readwise access token page: https://readwise.io/access_token.",
    },
  ],
  homepageUrl: "https://readwise.io",
  actions: readwiseActions,
};
