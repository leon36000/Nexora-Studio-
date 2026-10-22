import type { ProviderDefinition } from "../../core/types.ts";

import { proxiedmailActions } from "./actions.ts";

const service = "proxiedmail";

export const provider: ProviderDefinition = {
  service,
  displayName: "ProxiedMail",
  categories: ["Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "PROXIEDMAIL_API_TOKEN",
      description:
        "ProxiedMail API token used with the Token header. Copy it from the ProxiedMail Settings API page: https://proxiedmail.com/en/settings.",
    },
  ],
  homepageUrl: "https://proxiedmail.com/",
  actions: proxiedmailActions,
};
