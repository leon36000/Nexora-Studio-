import type { ProviderDefinition } from "../../core/types.ts";

import { callrailActions } from "./actions.ts";

const service = "callrail";

export const provider: ProviderDefinition = {
  service,
  displayName: "CallRail",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "CALLRAIL_API_KEY",
      description:
        "CallRail API key used with the Authorization: Token token header. Create or view API keys from your CallRail account integration settings: https://support.callrail.com/hc/en-us/articles/5712444672909-CallRail-s-API-documentation.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.callrail.com",
  actions: callrailActions,
};
