import type { ProviderDefinition } from "../../core/types.ts";

import { ciscoMerakiActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "cisco_meraki",
  displayName: "Cisco Meraki",
  categories: ["Developer Tools", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MERAKI_DASHBOARD_API_KEY",
      description:
        "Cisco Meraki Dashboard API key. Generate or manage personal API keys in the Meraki dashboard under Organization > API & Webhooks > API keys and access: https://developer.cisco.com/meraki/api-v1/authorization/",
    },
  ],
  homepageUrl: "https://meraki.cisco.com/",
  actions: ciscoMerakiActions,
};
