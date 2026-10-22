import type { ProviderDefinition } from "../../core/types.ts";

import { lumosActions } from "./actions.ts";

const service = "lumos";

export const provider: ProviderDefinition = {
  service,
  displayName: "Lumos",
  categories: ["Security", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "LUMOS_API_TOKEN",
      description:
        "Lumos API token sent as a Bearer token. Create and manage API keys in Lumos API settings: https://developers.lumos.com/docs/rest-api.",
    },
  ],
  homepageUrl: "https://www.lumos.com/",
  actions: lumosActions,
};
