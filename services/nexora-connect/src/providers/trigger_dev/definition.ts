import type { ProviderDefinition } from "../../core/types.ts";

import { triggerDevActions } from "./actions.ts";

const service = "trigger_dev";

export const provider: ProviderDefinition = {
  service,
  displayName: "Trigger.dev",
  categories: ["Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Secret API Key",
      placeholder: "tr_dev_...",
      description:
        "Trigger.dev secret API key used with the Authorization Bearer header. Find or create it in the Trigger.dev project dashboard API Keys section: https://trigger.dev/docs/apikeys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://trigger.dev",
  actions: triggerDevActions,
};
