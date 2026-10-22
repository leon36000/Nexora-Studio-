import type { ProviderDefinition } from "../../core/types.ts";

import { jamieActions } from "./actions.ts";

const service = "jamie";

export const provider: ProviderDefinition = {
  service,
  displayName: "Jamie",
  categories: ["Productivity", "AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "jk_...",
      description:
        "Jamie API key sent with the x-api-key header. Create it in Jamie Settings > Developers > API Keys: https://docs.meetjamie.ai/developers/api/getting-started.",
      extraFields: [
        {
          key: "keyScope",
          label: "Key Scope",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "personal",
          description:
            "Enter personal or workspace to match the Jamie API key type. Personal keys use /v1/me routes; workspace keys use /v1/workspace routes: https://docs.meetjamie.ai/developers/api/access-and-security.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.meetjamie.ai",
  actions: jamieActions,
};
