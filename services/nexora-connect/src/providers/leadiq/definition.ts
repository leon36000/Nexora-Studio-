import type { ProviderDefinition } from "../../core/types.ts";

import { leadiqActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "leadiq",
  displayName: "LeadIQ",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Secret Base64 API Key",
      placeholder: "your_secret_base64_api_key",
      description:
        "LeadIQ Secret Base64 API key sent in the HTTP Basic Authorization header. Copy it from Settings > API.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://leadiq.com",
  actions: leadiqActions,
};
