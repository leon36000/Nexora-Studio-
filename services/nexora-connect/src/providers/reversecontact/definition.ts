import type { ProviderDefinition } from "../../core/types.ts";

import { reversecontactActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "reversecontact",
  displayName: "Reverse Contact",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "rc_...",
      description:
        "Reverse Contact V2 API key sent as a Bearer token. Manage keys at https://app.reversecontact.com/docs/public/guides/api-key-management.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.reversecontact.com/",
  actions: reversecontactActions,
};
