import type { ProviderDefinition } from "../../core/types.ts";

import { timebuzzerActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "timebuzzer",
  displayName: "timeBuzzer",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_TIMEBUZZER_API_KEY",
      description:
        "timeBuzzer API key sent in the Authorization header. Create or copy it from your timeBuzzer account settings: https://my.timebuzzer.com/settings/api.",
    },
  ],
  homepageUrl: "https://timebuzzer.com",
  actions: timebuzzerActions,
};
