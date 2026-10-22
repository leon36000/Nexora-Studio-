import type { ProviderDefinition } from "../../core/types.ts";

import { autoboundActions } from "./actions.ts";

const service = "autobound";

export const provider: ProviderDefinition = {
  service,
  displayName: "Autobound",
  categories: ["Data", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "ab_...",
      description:
        "Autobound Signal API key sent with the x-api-key header. Create or copy it from the Signal API dashboard at https://signalapi.autobound.ai.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.autobound.ai",
  actions: autoboundActions,
};
