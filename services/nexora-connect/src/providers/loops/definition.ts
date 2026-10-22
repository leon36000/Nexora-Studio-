import type { ProviderDefinition } from "../../core/types.ts";

import { loopsActions } from "./actions.ts";

const service = "loops";

export const provider: ProviderDefinition = {
  service,
  displayName: "Loops",
  categories: ["Marketing", "Communication"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "d2d561f5ff80136f69b4b5a31b9fb3c9",
      description:
        "Loops API key used with the Authorization Bearer header. Generate or manage keys in Settings > API at https://app.loops.so/settings?page=api.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://loops.so",
  actions: loopsActions,
};
