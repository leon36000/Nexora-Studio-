import type { ProviderDefinition } from "../../core/types.ts";

import { qianfanActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "qianfan",
  displayName: "Baidu Qianfan",
  categories: ["AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "bce-v3/ALTAK-...",
      description:
        "Baidu Qianfan API key used with the Authorization Bearer header. Create it in System Management > API Key: https://cloud.baidu.com/doc/qianfan/s/wmh8l6tnf",
    },
  ],
  homepageUrl: "https://qianfan.cloud.baidu.com",
  actions: qianfanActions,
};
