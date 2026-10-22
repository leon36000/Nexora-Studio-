import type { ProviderDefinition } from "../../core/types.ts";

import { passslotActions } from "./actions.ts";

const service = "passslot";

export const provider: ProviderDefinition = {
  service,
  displayName: "PassSlot",
  description: "Create and manage Apple Wallet passes from PassSlot templates.",
  categories: ["Developer Tools", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "App Key",
      placeholder: "PASSSLOT_APP_KEY",
      description:
        "PassSlot App Key used as the HTTP Basic Auth username with an empty password. Create and manage App Keys in your PassSlot account as described at https://www.passslot.com/developer/api/start",
    },
  ],
  homepageUrl: "https://www.passslot.com",
  actions: passslotActions,
};
