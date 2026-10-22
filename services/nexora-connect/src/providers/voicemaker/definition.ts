import type { ProviderDefinition } from "../../core/types.ts";

import { voicemakerActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "voicemaker",
  displayName: "Voicemaker",
  categories: ["AI", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_VOICEMAKER_API_KEY",
      description:
        "Voicemaker API key sent as a Bearer token. Create or view API keys at https://developer.voicemaker.in/user/apikeys",
    },
  ],
  homepageUrl: "https://voicemaker.in/",
  actions: voicemakerActions,
};
