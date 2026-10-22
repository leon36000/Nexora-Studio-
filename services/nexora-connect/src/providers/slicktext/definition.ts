import type { ProviderDefinition } from "../../core/types.ts";

import { slicktextActions } from "./actions.ts";
export const provider: ProviderDefinition = {
  service: "slicktext",
  displayName: "SlickText",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_SLICKTEXT_API_KEY",
      description:
        "SlickText API key from Settings > API & Webhooks > API Keys: https://api.slicktext.com/docs/v2/overview.",
    },
  ],
  homepageUrl: "https://www.slicktext.com",
  actions: slicktextActions,
};
