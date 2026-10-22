import type { ProviderDefinition } from "../../core/types.ts";

import { smugmugActions } from "./actions.ts";

const service = "smugmug";

export const provider: ProviderDefinition = {
  service,
  displayName: "SmugMug",
  categories: ["Design", "Storage"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "smugmug_api_key",
      description:
        "SmugMug API key used for public API access via the APIKey query parameter. Request it here: https://api.smugmug.com/api/developer/apply",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.smugmug.com",
  actions: smugmugActions,
};
