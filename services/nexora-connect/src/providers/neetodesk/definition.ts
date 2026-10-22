import type { ProviderDefinition } from "../../core/types.ts";

import { neetodeskActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "neetodesk",
  displayName: "NeetoDesk",
  categories: ["Communication", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "neetodesk_api_key",
      description:
        "NeetoDesk workspace API key sent in the X-Api-Key header. Create it in Settings > API Keys: https://help.neetodesk.com/articles/api-keys.",
      extraFields: [
        {
          key: "subdomain",
          label: "Workspace Subdomain",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "your-workspace",
          description:
            "The part before .neetodesk.com in your workspace URL. See https://apidocs.neetodesk.com/getting-started/workspace-subdomain.",
        },
      ],
    },
  ],
  homepageUrl: "https://www.neeto.com/neetodesk",
  actions: neetodeskActions,
};
