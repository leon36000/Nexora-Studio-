import type { ProviderDefinition } from "../../core/types.ts";

import { globalpingActions } from "./actions.ts";

const service = "globalping";

export const provider: ProviderDefinition = {
  service,
  displayName: "Globalping",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Dashboard Token",
      placeholder: "gp_...",
      description:
        "Globalping Dashboard token used with the Authorization Bearer header. Generate it from the dashboard Tokens page: https://blog.globalping.io/globalping-dashboard-adopt-probes-earn-credits/",
      extraFields: [],
    },
  ],
  homepageUrl: "https://globalping.io",
  actions: globalpingActions,
};
