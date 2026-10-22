import type { ProviderDefinition } from "../../core/types.ts";

import { turbotPipesActions } from "./actions.ts";

const service = "turbot_pipes";

export const provider: ProviderDefinition = {
  service,
  displayName: "Turbot Pipes",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "TURBOT_PIPES_TOKEN",
      description:
        "Turbot Pipes API token sent as a Bearer token. Create or manage tokens from your Turbot Pipes profile: https://turbot.com/pipes/docs/profile#tokens.",
      extraFields: [
        {
          key: "userHandle",
          label: "User Handle",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "your-user-handle",
          description: "Turbot Pipes user handle that owns the workspace used for Query API requests.",
        },
        {
          key: "workspaceHandle",
          label: "Workspace Handle",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "your-workspace-handle",
          description: "Turbot Pipes workspace handle where SQL queries should run.",
        },
      ],
    },
  ],
  homepageUrl: "https://turbot.com/pipes",
  actions: turbotPipesActions,
};
