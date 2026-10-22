import type { ProviderDefinition } from "../../core/types.ts";

import { linkupActions } from "./actions.ts";

const service = "linkup";

export const provider: ProviderDefinition = {
  service,
  displayName: "Linkup",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "LINKUP_API_KEY",
      description:
        "Linkup API key used with the Authorization Bearer header. Create a Linkup account to get it: https://docs.linkup.so/pages/documentation/get-started/quickstart",
    },
  ],
  homepageUrl: "https://www.linkup.so",
  actions: linkupActions,
};
