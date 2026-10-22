import type { ProviderDefinition } from "../../core/types.ts";

import { tianyanchaActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "tianyancha",
  displayName: "Tianyancha",
  categories: ["Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "TIANYANCHA_API_TOKEN",
      description:
        "Tianyancha API token sent with the Authorization header. Obtain it from Data Center > My APIs: https://open.tianyancha.com/",
    },
  ],
  homepageUrl: "https://www.tianyancha.com/data",
  actions: tianyanchaActions,
};
