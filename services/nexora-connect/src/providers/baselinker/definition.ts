import type { ProviderDefinition } from "../../core/types.ts";

import { baseLinkerActions } from "./actions.ts";

const service = "baselinker";

export const provider: ProviderDefinition = {
  service,
  displayName: "BaseLinker",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "BASELINKER_API_TOKEN",
      description:
        "BaseLinker API token sent with the X-BLToken header. Generate it in BaseLinker under Account & other > My account > API: https://api.baselinker.com/.",
    },
  ],
  homepageUrl: "https://baselinker.com",
  actions: baseLinkerActions,
};
