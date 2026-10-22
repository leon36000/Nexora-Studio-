import type { ProviderDefinition } from "../../core/types.ts";

import { mailboxValidatorActions } from "./actions.ts";

const service = "mailbox_validator";

export const provider: ProviderDefinition = {
  service,
  displayName: "MailboxValidator",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MAILBOX_VALIDATOR_API_KEY",
      description:
        "MailboxValidator sends your API key as the key query parameter. Get it from the MailboxValidator dashboard: https://www.mailboxvalidator.com/dashboard.",
    },
  ],
  homepageUrl: "https://www.mailboxvalidator.com",
  actions: mailboxValidatorActions,
};
