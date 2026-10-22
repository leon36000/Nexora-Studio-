import type { ProviderDefinition } from "../../core/types.ts";

import { concordActions } from "./actions.ts";

const service = "concord";

export const provider: ProviderDefinition = {
  service,
  displayName: "Concord",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_CONCORD_API_KEY",
      description:
        "Concord API key sent in the X-API-KEY header. Generate one from your paid Concord account: https://help.concord.app/hc/en-us/articles/360055115911-getting-started-with-the-concord-api.",
    },
  ],
  homepageUrl: "https://www.concord.app/",
  actions: concordActions,
};
