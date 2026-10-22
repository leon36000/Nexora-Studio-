import type { ProviderDefinition } from "../../core/types.ts";

import { superchatActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "superchat",
  displayName: "Superchat",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SUPERCHAT_API_KEY",
      description:
        "Superchat workspace API key sent with the X-API-KEY header. Find it in Superchat settings under API or integrations.",
    },
  ],
  homepageUrl: "https://www.superchat.com",
  actions: superchatActions,
};
