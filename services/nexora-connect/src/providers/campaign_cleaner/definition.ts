import type { ProviderDefinition } from "../../core/types.ts";

import { campaignCleanerActions } from "./actions.ts";

const service = "campaign_cleaner";

export const provider: ProviderDefinition = {
  service,
  displayName: "Campaign Cleaner",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "cc_live_xxxxxxxxxxxxx",
      description:
        "Campaign Cleaner API key sent in the X-CC-API-Key header. Manage API keys from API Management in the Campaign Cleaner dashboard.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://campaigncleaner.com",
  actions: campaignCleanerActions,
};
