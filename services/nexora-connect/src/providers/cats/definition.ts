import type { ProviderDefinition } from "../../core/types.ts";

import { catsActions } from "./actions.ts";

const service = "cats";

export const provider: ProviderDefinition = {
  service,
  displayName: "CATS",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CATS_API_KEY",
      description:
        "CATS v3 API key sent with the Authorization Token header. Create it from the Administration settings page in CATS.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://catsone.com/",
  actions: catsActions,
};
