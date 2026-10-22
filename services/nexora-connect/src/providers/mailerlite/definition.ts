import type { ProviderDefinition } from "../../core/types.ts";

import { mailerliteActions } from "./actions.ts";

const service = "mailerlite";

export const provider: ProviderDefinition = {
  service,
  displayName: "MailerLite",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ml_...",
      description:
        "MailerLite API key used with the Authorization Bearer header. Generate it in Integrations > MailerLite API.",
    },
  ],
  homepageUrl: "https://www.mailerlite.com",
  actions: mailerliteActions,
};
