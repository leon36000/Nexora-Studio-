import type { ProviderDefinition } from "../../core/types.ts";

import { tldvActions } from "./actions.ts";

const service = "tldv";

export const provider: ProviderDefinition = {
  service,
  displayName: "tl;dv",
  categories: ["Productivity", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TLDV_API_KEY",
      description:
        "tl;dv API key sent with the x-api-key header. Generate it from the tl;dv API keys page: https://tldv.io/app/settings/personal-settings/api-keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://tldv.io",
  actions: tldvActions,
};
