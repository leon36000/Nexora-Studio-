import type { ProviderDefinition } from "../../core/types.ts";

import { bitqueryActions } from "./actions.ts";

const service = "bitquery";

export const provider: ProviderDefinition = {
  service,
  displayName: "Bitquery",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "BITQUERY_ACCESS_TOKEN",
      description:
        "Bitquery access token sent as a Bearer token. Generate or copy tokens from the Bitquery Authorization page: https://account.bitquery.io/user/api_v2/access_tokens.",
    },
  ],
  homepageUrl: "https://bitquery.io",
  actions: bitqueryActions,
};
