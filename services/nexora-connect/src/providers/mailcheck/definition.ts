import type { ProviderDefinition } from "../../core/types.ts";

import { mailcheckActions } from "./actions.ts";

const service = "mailcheck";

export const provider: ProviderDefinition = {
  service,
  displayName: "Mailcheck",
  categories: ["Communication", "Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "USERCHECK_API_KEY",
      description:
        "UserCheck API key used with the Authorization Bearer header. Generate it in the API Keys section of your dashboard: https://www.usercheck.com/docs/api/authentication.",
    },
  ],
  homepageUrl: "https://www.usercheck.com",
  actions: mailcheckActions,
};
