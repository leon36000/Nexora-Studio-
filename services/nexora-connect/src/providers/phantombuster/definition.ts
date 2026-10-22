import type { ProviderDefinition } from "../../core/types.ts";

import { phantombusterActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "phantombuster",
  displayName: "PhantomBuster",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "phantombuster_api_key",
      description:
        "PhantomBuster API key sent with the X-Phantombuster-Key header. Create or view it from https://phantombuster.com/workspace-settings.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://phantombuster.com",
  actions: phantombusterActions,
};
