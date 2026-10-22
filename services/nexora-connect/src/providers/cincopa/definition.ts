import type { ProviderDefinition } from "../../core/types.ts";

import { cincopaActions } from "./actions.ts";

const service = "cincopa";

export const provider: ProviderDefinition = {
  service,
  displayName: "Cincopa",
  categories: ["Design & Media", "Storage"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "CINCOPA_API_TOKEN",
      description: "Cincopa API token sent as the api_token query parameter.",
    },
  ],
  homepageUrl: "https://www.cincopa.com/",
  actions: cincopaActions,
};
