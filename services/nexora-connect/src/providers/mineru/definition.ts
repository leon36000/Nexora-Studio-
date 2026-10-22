import type { ProviderDefinition } from "../../core/types.ts";

import { mineruActions } from "./actions.ts";

const service = "mineru";

export const provider: ProviderDefinition = {
  service,
  displayName: "MinerU",
  categories: ["AI", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "mineru_api_token",
      description:
        "MinerU API token used with the Authorization Bearer header. Apply for or manage it here: https://mineru.net/apiManage/token",
    },
  ],
  homepageUrl: "https://mineru.net",
  actions: mineruActions,
};
