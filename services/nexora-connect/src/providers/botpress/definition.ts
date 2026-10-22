import type { ProviderDefinition } from "../../core/types.ts";

import { botpressActions } from "./actions.ts";

const service = "botpress";

export const provider: ProviderDefinition = {
  service,
  displayName: "Botpress",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "BOTPRESS_API_TOKEN",
      description:
        "Botpress API token sent as a Bearer token. Generate a token from the Botpress dashboard API settings and use it with your workspace ID: https://botpress.com/docs/api-reference/admin-api/getting-started.",
      extraFields: [
        {
          key: "workspaceId",
          label: "Workspace ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "wkspace_...",
          description:
            "Botpress workspace ID sent with the x-workspace-id header. Copy it from your Botpress workspace settings or Admin API examples: https://botpress.com/docs/api-reference/admin-api/getting-started.",
        },
      ],
    },
  ],
  homepageUrl: "https://botpress.com",
  actions: botpressActions,
};
