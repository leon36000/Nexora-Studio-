import type { ProviderDefinition } from "../../core/types.ts";

import { rechargeActions } from "./actions.ts";

const service = "recharge";

export const provider: ProviderDefinition = {
  service,
  displayName: "Recharge",
  categories: ["Finance", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "recharge_api_token",
      description:
        "Recharge API token used with the X-Recharge-Access-Token header. Create it in the Recharge merchant portal under Tools & apps > API tokens: https://docs.getrecharge.com/docs/recharge-api-key.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://getrecharge.com/",
  actions: rechargeActions,
};
