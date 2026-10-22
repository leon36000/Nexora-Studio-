import type { ProviderDefinition } from "../../core/types.ts";

import { startonActions } from "./actions.ts";

const service = "starton";

export const provider: ProviderDefinition = {
  service,
  displayName: "Starton",
  categories: ["Storage", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "starton_api_key",
      description:
        "Starton API key sent with the x-api-key header. Create it in Starton project developer settings: https://app.starton.com/projects/default/developer.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://starton.com",
  actions: startonActions,
};
