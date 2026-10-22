import type { ProviderDefinition } from "../../core/types.ts";

import { mailersendActions } from "./actions.ts";

const service = "mailersend";

export const provider: ProviderDefinition = {
  service,
  displayName: "MailerSend",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "mlsn_...",
      description:
        "MailerSend API token used with the Authorization Bearer header. Create it from Integrations > MailerSend API > Manage.",
    },
  ],
  homepageUrl: "https://www.mailersend.com",
  actions: mailersendActions,
};
