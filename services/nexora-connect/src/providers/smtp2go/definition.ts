import type { ProviderDefinition } from "../../core/types.ts";

import { smtp2goActions } from "./actions.ts";

const service = "smtp2go";

export const provider: ProviderDefinition = {
  service,
  displayName: "SMTP2GO",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "api-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      description:
        "SMTP2GO API key used with the X-Smtp2go-Api-Key request header. Create and manage keys in the SMTP2GO app under Sending > API Keys: https://app.smtp2go.com/.",
    },
  ],
  homepageUrl: "https://www.smtp2go.com/",
  actions: smtp2goActions,
};
