import type { ProviderDefinition } from "../../core/types.ts";

import { recurlyActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "recurly",
  displayName: "Recurly",
  categories: ["Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Private API Key",
      placeholder: "RECURLY_PRIVATE_API_KEY",
      description:
        "Recurly private API key used as the HTTP Basic Auth username with an empty password. Create or view keys on the Recurly API Credentials page: https://app.recurly.com/go/developer/api_keys.",
    },
  ],
  homepageUrl: "https://recurly.com",
  actions: recurlyActions,
};
