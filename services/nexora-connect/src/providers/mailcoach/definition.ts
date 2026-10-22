import type { ProviderDefinition } from "../../core/types.ts";

import { mailcoachActions } from "./actions.ts";

const service = "mailcoach";

export const provider: ProviderDefinition = {
  service,
  displayName: "Mailcoach",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "Your Mailcoach API token",
      description:
        "Mailcoach API token sent as a Bearer credential. Create or manage tokens at https://dashboard.mailcoach.app/settings/account/tokens.",
      extraFields: [
        {
          key: "baseUrl",
          label: "Base URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://your-domain.mailcoach.app",
          description: "Base URL of your Mailcoach Cloud account or self-hosted installation, without the /api suffix.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.mailcoach.app",
  actions: mailcoachActions,
};
