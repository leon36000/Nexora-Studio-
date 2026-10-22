import type { ProviderDefinition } from "../../core/types.ts";

import { memberstackActions } from "./actions.ts";

const service = "memberstack";

export const provider: ProviderDefinition = {
  service,
  displayName: "Memberstack",
  categories: ["Security", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Secret Key",
      placeholder: "MEMBERSTACK_SECRET_KEY",
      description:
        "Memberstack secret key sent with the x-api-key request header. View and manage keys in your Memberstack dashboard under Dev Tools > Keys & IDs: https://app.memberstack.com/.",
    },
  ],
  homepageUrl: "https://www.memberstack.com/",
  actions: memberstackActions,
};
