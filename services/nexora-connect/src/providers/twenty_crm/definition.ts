import type { ProviderDefinition } from "../../core/types.ts";

import { twentyCrmActions } from "./actions.ts";

const service = "twenty_crm";

export const provider: ProviderDefinition = {
  service,
  displayName: "Twenty CRM",
  categories: ["Productivity", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "twenty_api_key",
      description:
        "Twenty API key sent as a Bearer token. Create a key in Settings > API & Webhooks > Create key in your Twenty workspace: https://docs.twenty.com/developers/extend/api",
      extraFields: [],
    },
  ],
  homepageUrl: "https://twenty.com",
  actions: twentyCrmActions,
};
