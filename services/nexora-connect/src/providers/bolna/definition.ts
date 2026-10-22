import type { ProviderDefinition } from "../../core/types.ts";

import { bolnaActions } from "./actions.ts";

const service = "bolna";

export const provider: ProviderDefinition = {
  service,
  displayName: "Bolna",
  categories: ["AI", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "sk-...",
      description:
        "Bolna API key used with the Authorization Bearer header. Sign in to the Bolna dashboard, open Developers, and create a new API key: https://platform.bolna.ai",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.bolna.ai",
  actions: bolnaActions,
};
