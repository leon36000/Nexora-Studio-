import type { ProviderDefinition } from "../../core/types.ts";

import { slickdealsActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "slickdeals",
  displayName: "Slickdeals",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Syndication Token",
      placeholder: "Enter your Slickdeals token",
      description:
        "Bearer token issued by Slickdeals for the Syndication API. Request partner access from https://corp-site.slickdeals.net/api-sales/.",
    },
  ],
  homepageUrl: "https://slickdeals.net/",
  actions: slickdealsActions,
};
