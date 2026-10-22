import type { ProviderDefinition } from "../../core/types.ts";

import { v0Actions } from "./actions.ts";

const service = "v0";

export const provider: ProviderDefinition = {
  service,
  displayName: "v0",
  categories: ["AI", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "v0_api_key",
      description: "v0 API key used with the Authorization Bearer header. Get it from v0 settings.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://v0.dev",
  actions: v0Actions,
};
