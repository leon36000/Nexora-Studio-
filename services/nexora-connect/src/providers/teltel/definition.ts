import type { ProviderDefinition } from "../../core/types.ts";

import { teltelActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "teltel",
  displayName: "TelTel",
  categories: ["Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TELTEL_API_KEY",
      description:
        "TelTel API key sent with the X-API-KEY header. Find it under Settings in your TelTel account: https://teltel.io/v2/login.",
    },
  ],
  homepageUrl: "https://www.teltel.io",
  actions: teltelActions,
};
