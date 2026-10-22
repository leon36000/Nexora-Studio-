import type { ProviderDefinition } from "../../core/types.ts";

import { delightedActions } from "./actions.ts";

const service = "delighted";

export const provider: ProviderDefinition = {
  service,
  displayName: "Delighted",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "delighted_api_key",
      description:
        "Delighted private API key used as the HTTP Basic Auth username with an empty password. Find the project-specific key under Integrations > API in Delighted: https://app.delighted.com/docs/api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://delighted.com",
  actions: delightedActions,
};
