import type { ProviderDefinition } from "../../core/types.ts";

import { commpeakActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "commpeak",
  displayName: "CommPeak",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "TextPeak API Key",
      placeholder: "COMMPEAK_TEXTPEAK_API_KEY",
      description:
        "CommPeak TextPeak API key sent as the raw Authorization header value. Create or view API keys in TextPeak Settings > API Keys: https://docs.commpeak.com/docs/api-keys",
    },
  ],
  homepageUrl: "https://www.commpeak.com/",
  actions: commpeakActions,
};
