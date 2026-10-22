import type { ProviderDefinition } from "../../core/types.ts";

import { intuifaceActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "intuiface",
  displayName: "Intuiface",
  categories: ["Communication", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Credential Key",
      placeholder: "INTUIFACE_CREDENTIAL_KEY",
      description:
        "Intuiface Credential Key with the Web Triggers scope, sent in the x-api-key header. Create or manage keys on the official Credential Keys page: https://my.intuiface.com/credentialkeys?scope=API_WebTriggers.",
    },
  ],
  homepageUrl: "https://www.intuiface.com/",
  actions: intuifaceActions,
};
