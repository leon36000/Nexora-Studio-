import type { ProviderDefinition } from "../../core/types.ts";

import { wootActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "woot",
  displayName: "Woot",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "WOOT_API_KEY",
      description:
        "Woot developer API key sent in the x-api-key header. Request a key through the official Woot developer forum: https://forums.woot.com/t/request-developer-api-key/734283",
    },
  ],
  homepageUrl: "https://www.woot.com",
  actions: wootActions,
};
