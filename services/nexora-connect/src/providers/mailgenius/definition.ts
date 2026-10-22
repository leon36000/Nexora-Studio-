import type { ProviderDefinition } from "../../core/types.ts";

import { mailgeniusActions } from "./actions.ts";

const service = "mailgenius";

export const provider: ProviderDefinition = {
  service,
  displayName: "MailGenius",
  description: "Create inbound email deliverability audits and retrieve MailGenius test results.",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "MAILGENIUS_API_TOKEN",
      description:
        "MailGenius API token sent with the Authorization Bearer header. Create and manage API tokens in the MailGenius application: https://app.mailgenius.com/.",
    },
  ],
  homepageUrl: "https://www.mailgenius.com/",
  actions: mailgeniusActions,
};
