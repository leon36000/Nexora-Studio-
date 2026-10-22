import type { ProviderDefinition } from "../../core/types.ts";

import { tushareActions } from "./actions.ts";

const service = "tushare";

export const provider: ProviderDefinition = {
  service,
  displayName: "Tushare",
  categories: ["Finance", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Tushare Token",
      placeholder: "TUSHARE_TOKEN",
      description:
        "Tushare token used as the token field in HTTP API requests. Log in, open Personal Center > Account and TOKEN, then copy it as documented at https://tushare.pro/document/1?doc_id=39.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://tushare.pro",
  actions: tushareActions,
};
