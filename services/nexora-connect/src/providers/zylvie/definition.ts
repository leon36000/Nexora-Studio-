import type { ProviderDefinition } from "../../core/types.ts";

import { zylvieActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "zylvie",
  displayName: "Zylvie",
  categories: ["Marketing", "Finance"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ZYLVIE_API_KEY",
      description: "Zylvie API key sent as a Bearer token. Copy it from https://developers.zylvie.com/settings/api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://zylvie.com/",
  actions: zylvieActions,
};
