import type { ProviderDefinition } from "../../core/types.ts";

import { respondIoActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "respond_io",
  displayName: "Respond.io",
  description: "Manage Respond.io contacts, conversations, users, channels, and tags.",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Developer API Access Token",
      placeholder: "RESPOND_IO_ACCESS_TOKEN",
      description:
        "Respond.io Developer API access token sent as a Bearer token. Developer API requires the Growth plan or above. Create a token in Workspace Settings > Integrations > Developer API: https://respond.io/help/integrations/developer-api",
    },
  ],
  homepageUrl: "https://respond.io/",
  actions: respondIoActions,
};
