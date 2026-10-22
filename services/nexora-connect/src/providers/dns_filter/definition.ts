import type { ProviderDefinition } from "../../core/types.ts";

import { dnsFilterActions } from "./actions.ts";

const service = "dns_filter";

export const provider: ProviderDefinition = {
  service,
  displayName: "DNSFilter",
  categories: ["Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "dnsfilter_api_token",
      description:
        "DNSFilter API token sent directly in the Authorization header. Create or view API tokens in the DNSFilter dashboard under Account Settings: https://help.dnsfilter.com/hc/en-us/articles/21169189058323-API-Tokens.",
    },
  ],
  homepageUrl: "https://www.dnsfilter.com",
  actions: dnsFilterActions,
};
