import type { ProviderDefinition } from "../../core/types.ts";

import { salesflareActions } from "./actions.ts";

const service = "salesflare";

export const provider: ProviderDefinition = {
  service,
  displayName: "Salesflare",
  categories: ["Productivity", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "salesflare_api_key",
      description: "Salesflare API key sent as a Bearer token. Create it in Salesflare under Settings > API keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://salesflare.com",
  actions: salesflareActions,
};
