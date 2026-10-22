import type { ProviderDefinition } from "../../core/types.ts";

import { godialActions } from "./actions.ts";

const service = "godial";

export const provider: ProviderDefinition = {
  service,
  displayName: "GoDial",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "GODIAL_ACCESS_TOKEN",
      description:
        "GoDial external API access token passed as the access_token query parameter. Generate or view it in GoDial at Dashboard -> Integration -> External API, as described in the official integration guide: https://godial.cc/blog/integrating-your-website-or-crm-with-godial-using-api/",
      extraFields: [],
    },
  ],
  homepageUrl: "https://godial.cc",
  actions: godialActions,
};
