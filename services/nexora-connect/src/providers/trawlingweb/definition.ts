import type { ProviderDefinition } from "../../core/types.ts";

import { trawlingwebActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "trawlingweb",
  displayName: "TrawlingWeb",
  categories: ["Data", "Social"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "TRAWLINGWEB_API_TOKEN",
      description:
        "TrawlingWeb API token sent as the token query parameter. Sign in or create an account through the official FeedScale console at https://console.trawlingweb.app/login, then copy the token from your dashboard.",
    },
  ],
  homepageUrl: "https://trawlingweb.com",
  actions: trawlingwebActions,
};
