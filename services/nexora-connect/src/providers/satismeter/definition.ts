import type { ProviderDefinition } from "../../core/types.ts";

import { satismeterActions } from "./actions.ts";

const service = "satismeter";

export const provider: ProviderDefinition = {
  service,
  displayName: "SatisMeter",
  categories: ["Marketing", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "satismeter_api_key",
      description:
        "SatisMeter API key used with the Authorization Bearer header. Find it in your SatisMeter project under Settings > Integrations > API.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://satismeter.com",
  actions: satismeterActions,
};
