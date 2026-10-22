import type { ProviderDefinition } from "../../core/types.ts";

import { nextDnsActions } from "./actions.ts";

const service = "next_dns";

/**
 * NextDNS provider backed by the public NextDNS API.
 */
export const provider: ProviderDefinition = {
  service,
  displayName: "NextDNS",
  categories: ["Security", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "NEXTDNS_API_KEY",
      description:
        "NextDNS API key passed with the X-Api-Key header. Create or view API keys in the NextDNS account page: https://my.nextdns.io/account",
      extraFields: [],
    },
  ],
  homepageUrl: "https://nextdns.io/",
  actions: nextDnsActions,
};
