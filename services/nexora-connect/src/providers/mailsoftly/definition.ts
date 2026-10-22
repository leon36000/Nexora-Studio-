import type { ProviderDefinition } from "../../core/types.ts";

import { mailsoftlyActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "mailsoftly",
  displayName: "Mailsoftly",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "mailsoftly_api_token",
      description:
        "Mailsoftly API token sent directly in the Authorization header. Manage it at https://app.mailsoftly.com/.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://mailsoftly.com/",
  actions: mailsoftlyActions,
};
