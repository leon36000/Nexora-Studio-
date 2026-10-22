import type { ProviderDefinition } from "../../core/types.ts";

import { sitespeakaiActions } from "./actions.ts";

const service = "sitespeakai";

export const provider: ProviderDefinition = {
  service,
  displayName: "SiteSpeakAI",
  categories: ["AI", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "YOUR_API_TOKEN",
      description:
        "SiteSpeakAI API token sent with the Authorization Bearer header. Generate one from your SiteSpeakAI account page: https://sitespeak.ai/user/api-tokens",
    },
  ],
  homepageUrl: "https://sitespeak.ai",
  actions: sitespeakaiActions,
};
