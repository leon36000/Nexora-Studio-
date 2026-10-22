import type { ProviderDefinition } from "../../core/types.ts";

import { whatsableActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "whatsable",
  displayName: "WhatsAble",
  categories: ["Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "WHATSABLE_API_KEY",
      description:
        "WhatsAble API key sent with the Authorization header. Copy it from API Keys in the WhatsAble dashboard: https://dashboard.whatsable.app.",
    },
  ],
  homepageUrl: "https://whatsable.app",
  actions: whatsableActions,
};
