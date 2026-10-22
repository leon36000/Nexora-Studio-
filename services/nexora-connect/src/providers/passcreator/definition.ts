import type { ProviderDefinition } from "../../core/types.ts";

import { passcreatorActions } from "./actions.ts";

const service = "passcreator";

export const provider: ProviderDefinition = {
  service,
  displayName: "Passcreator",
  categories: ["Design & Media", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "PASSCREATOR_API_KEY",
      description:
        "Passcreator API key sent in the Authorization header without a prefix. Create or manage API keys at https://app.passcreator.com/customeruser/apikeys.",
    },
  ],
  homepageUrl: "https://www.passcreator.com/",
  actions: passcreatorActions,
};
