import type { ProviderDefinition } from "../../core/types.ts";

import { brevoActions } from "./actions.ts";

const service = "brevo";

export const provider: ProviderDefinition = {
  service,
  displayName: "Brevo",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "xkeysib_...",
      description:
        "Brevo API key sent with the api-key header. Create or copy API keys in Brevo under SMTP & API > API Keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.brevo.com",
  actions: brevoActions,
};
