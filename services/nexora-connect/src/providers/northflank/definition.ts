import type { ProviderDefinition } from "../../core/types.ts";

import { northflankActions } from "./actions.ts";

const service = "northflank";

export const provider: ProviderDefinition = {
  service,
  displayName: "Northflank",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "NORTHFLANK_API_TOKEN",
      description:
        "Northflank API token sent as a Bearer token. Create one from https://app.northflank.com/s/account/api/tokens.",
    },
  ],
  homepageUrl: "https://northflank.com",
  actions: northflankActions,
};
