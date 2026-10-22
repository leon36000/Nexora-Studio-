import type { ProviderDefinition } from "../../core/types.ts";

import { teamtailorActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "teamtailor",
  displayName: "Teamtailor",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "teamtailor_api_key",
      description:
        "Teamtailor API key sent with the Authorization: Token token=<key> header. Manage keys under Settings > Integrations > API keys: https://app.teamtailor.com/app/settings/integrations/api-keys.",
      extraFields: [
        {
          key: "stack",
          label: "Stack",
          inputType: "text",
          required: false,
          secret: false,
          placeholder: "eu",
          description: "Teamtailor data stack. Use eu for api.teamtailor.com or na for api.na.teamtailor.com.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.teamtailor.com/",
  actions: teamtailorActions,
};
