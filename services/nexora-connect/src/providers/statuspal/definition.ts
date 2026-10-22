import type { ProviderDefinition } from "../../core/types.ts";

import { statuspalActions } from "./actions.ts";

const service = "statuspal";

export const provider: ProviderDefinition = {
  service,
  displayName: "StatusPal",
  categories: ["Developer Tools", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "STATUSPAL_API_KEY",
      description:
        "StatusPal API key used with the Authorization header. Copy it from your StatusPal profile settings API section.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.statuspal.io",
  actions: statuspalActions,
};
