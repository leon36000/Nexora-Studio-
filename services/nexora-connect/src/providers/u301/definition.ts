import type { ProviderDefinition } from "../../core/types.ts";

import { u301Actions } from "./actions.ts";

const service = "u301";

export const provider: ProviderDefinition = {
  service,
  displayName: "U301",
  categories: ["Marketing", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "uat_...",
      description:
        "U301 API key sent with the Authorization Bearer header. Create it in the U301 dashboard: https://u301.com/app/api-key",
      extraFields: [
        {
          key: "workspaceId",
          label: "Workspace ID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "0196684a-3b57-7000-805b-88c32c3c5dc7",
          description:
            "Workspace identifier required by U301 for multi-tenant routing. Copy it from the U301 dashboard or your API examples after creating a workspace: https://u301.com/docs/u301-js",
        },
      ],
    },
  ],
  homepageUrl: "https://u301.com",
  actions: u301Actions,
};
