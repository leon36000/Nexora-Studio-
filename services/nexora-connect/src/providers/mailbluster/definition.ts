import type { ProviderDefinition } from "../../core/types.ts";

import { mailblusterActions } from "./actions.ts";

const service = "mailbluster";

export const provider: ProviderDefinition = {
  service,
  displayName: "MailBluster",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MAILBLUSTER_API_KEY",
      description:
        "MailBluster API key sent in the Authorization header. Create it from Brand Settings > API keys in MailBluster after signing in: https://app.mailbluster.com/api-doc/getting-started.",
    },
  ],
  homepageUrl: "https://mailbluster.com",
  actions: mailblusterActions,
};
