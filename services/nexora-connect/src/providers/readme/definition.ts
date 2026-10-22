import type { ProviderDefinition } from "../../core/types.ts";

import { readmeActions } from "./actions.ts";

const service = "readme";

export const provider: ProviderDefinition = {
  service,
  displayName: "ReadMe",
  categories: ["Developer Tools", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "readme_api_key",
      description:
        "ReadMe API key sent with HTTP Basic authentication. Create or rotate keys from the API Keys page in your ReadMe dashboard.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://readme.com",
  actions: readmeActions,
};
