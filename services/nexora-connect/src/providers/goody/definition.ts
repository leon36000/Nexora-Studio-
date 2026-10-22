import type { ProviderDefinition } from "../../core/types.ts";

import { goodyActions } from "./actions.ts";

const service = "goody";

export const provider: ProviderDefinition = {
  service,
  displayName: "Goody",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "goody_...",
      description:
        "Goody API key sent in the Authorization Bearer header. Create and manage keys from Goody developer mode and API settings: https://developer.ongoody.com/introduction/developer-mode",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.ongoody.com",
  actions: goodyActions,
};
