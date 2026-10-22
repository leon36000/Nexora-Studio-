import type { ProviderDefinition } from "../../core/types.ts";

import { leadboxerActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "leadboxer",
  displayName: "LeadBoxer",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "LEADBOXER_API_KEY",
      description:
        "LeadBoxer API key sent with the x-api-key header. Generate or copy it from Integrations settings at https://app.leadboxer.com.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.leadboxer.com/",
  actions: leadboxerActions,
};
