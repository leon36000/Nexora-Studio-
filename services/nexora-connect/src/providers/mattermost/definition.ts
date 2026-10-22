import type { ProviderDefinition } from "../../core/types.ts";

import { mattermostActions } from "./actions.ts";

const service = "mattermost";

export const provider: ProviderDefinition = {
  service,
  displayName: "Mattermost",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "MATTERMOST_PERSONAL_ACCESS_TOKEN",
      description:
        "Mattermost Personal Access Token used with the Authorization: Bearer <token> header. Create or manage tokens from your Mattermost account settings.",
      extraFields: [
        {
          key: "instanceUrl",
          label: "Instance URL",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "https://mattermost.example.com",
          description: "The root URL for your Mattermost instance. URLs ending in /api/v4 are also accepted.",
        },
      ],
    },
  ],
  homepageUrl: "https://mattermost.com",
  actions: mattermostActions,
};
