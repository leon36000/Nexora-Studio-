import type { ProviderDefinition } from "../../core/types.ts";

import { contactoutActions } from "./actions.ts";

const service = "contactout";

export const provider: ProviderDefinition = {
  service,
  displayName: "ContactOut",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "CONTACTOUT_API_TOKEN",
      description:
        "ContactOut API token sent with the token request header. ContactOut asks users to request API access from the official API docs: https://api.contactout.com/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://contactout.com",
  actions: contactoutActions,
};
