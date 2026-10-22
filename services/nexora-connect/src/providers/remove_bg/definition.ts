import type { ProviderDefinition } from "../../core/types.ts";

import { removeBgActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "remove_bg",
  displayName: "remove.bg",
  categories: ["AI", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "removebg_api_key",
      description:
        "remove.bg API key sent with the X-Api-Key header. Create it from your remove.bg account as described at https://www.remove.bg/r/api-how-to-get-api-key.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.remove.bg",
  actions: removeBgActions,
};
