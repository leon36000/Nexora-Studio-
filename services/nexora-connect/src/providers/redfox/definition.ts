import type { ProviderDefinition } from "../../core/types.ts";

import { redfoxActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "redfox",
  displayName: "RedFoxHub",
  categories: ["Social", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "REDFOX_API_KEY",
      description:
        "RedFoxHub API key sent with the REDFOX_API_KEY header. Register or sign in at https://redfox.hk, then create or view keys in Key Management: https://redfox.hk/settings/api-keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://redfox.hk",
  actions: redfoxActions,
};
