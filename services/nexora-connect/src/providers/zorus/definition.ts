import type { ProviderDefinition } from "../../core/types.ts";

import { zorusActions } from "./actions.ts";

const service = "zorus";

export const provider: ProviderDefinition = {
  service,
  displayName: "Zorus",
  categories: ["Security"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "zorus_api_token",
      description:
        "Zorus API token sent in the Authorization header as an impersonation token. Generate it in the Zorus Portal under Integrations > API Access: https://portal.zorustech.com/integrations/api-keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.zorustech.com",
  actions: zorusActions,
};
