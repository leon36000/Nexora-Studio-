import type { ProviderDefinition } from "../../core/types.ts";

import { simpleLocalizeActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "simplelocalize",
  displayName: "SimpleLocalize",
  categories: ["Developer Tools", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Project API Key",
      placeholder: "YOUR_PROJECT_API_KEY",
      description:
        "SimpleLocalize project API key. Copy it from Settings > Credentials > API Key: https://simplelocalize.io/docs/api/get-started/",
    },
  ],
  homepageUrl: "https://simplelocalize.io",
  actions: simpleLocalizeActions,
};
