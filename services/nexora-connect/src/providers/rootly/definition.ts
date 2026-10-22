import type { ProviderDefinition } from "../../core/types.ts";

import { rootlyActions } from "./actions.ts";

const service = "rootly";

export const provider: ProviderDefinition = {
  service,
  displayName: "Rootly",
  categories: ["Developer Tools", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "rootly_api_key",
      description: "Rootly API key sent with the Authorization Bearer header. Generate it in Rootly API settings.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://rootly.com",
  actions: rootlyActions,
};
