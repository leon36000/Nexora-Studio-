import type { ProviderDefinition } from "../../core/types.ts";

import { browserlessActions } from "./actions.ts";

const service = "browserless";

export const provider: ProviderDefinition = {
  service,
  displayName: "Browserless",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "YOUR_API_TOKEN_HERE",
      description:
        "Browserless API token appended as the token query parameter. Create or copy it from the Browserless dashboard and REST API quickstart: https://docs.browserless.io/rest-apis/intro.",
    },
  ],
  homepageUrl: "https://www.browserless.io",
  actions: browserlessActions,
};
