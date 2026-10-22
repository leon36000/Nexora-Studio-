import type { ProviderDefinition } from "../../core/types.ts";

import { blocknativeActions } from "./actions.ts";

const service = "blocknative";

export const provider: ProviderDefinition = {
  service,
  displayName: "Blocknative",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "BLOCKNATIVE_API_KEY",
      description:
        "Blocknative API key sent with the Authorization header. Request or manage it from the official Blocknative API key page: https://www.blocknative.com/request-api-key",
    },
  ],
  homepageUrl: "https://www.blocknative.com",
  actions: blocknativeActions,
};
