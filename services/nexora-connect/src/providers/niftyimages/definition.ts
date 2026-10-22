import type { ProviderDefinition } from "../../core/types.ts";

import { niftyimagesActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "niftyimages",
  displayName: "NiftyImages",
  categories: ["Design & Media", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "NIFTYIMAGES_API_KEY",
      description:
        "NiftyImages API key sent in the ApiKey header. After signing in at https://ux.niftyimages.com, open Settings and select My API Keys to create or view a key. API reference: https://api.niftyimages.com/images",
    },
  ],
  homepageUrl: "https://niftyimages.com/",
  actions: niftyimagesActions,
};
