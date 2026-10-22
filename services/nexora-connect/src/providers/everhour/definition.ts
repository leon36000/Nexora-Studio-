import type { ProviderDefinition } from "../../core/types.ts";

import { everhourActions } from "./actions.ts";

const service = "everhour";

export const provider: ProviderDefinition = {
  service,
  displayName: "Everhour",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "abcd-efgh-1234567-7890ab-cdefgh12",
      description:
        "Everhour API key used with the X-Api-Key header. Find it at the bottom of your Everhour profile page.",
    },
  ],
  homepageUrl: "https://everhour.com",
  actions: everhourActions,
};
