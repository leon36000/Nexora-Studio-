import type { ProviderDefinition } from "../../core/types.ts";

import { zhihuActions } from "./actions.ts";

const service = "zhihu";

export const provider: ProviderDefinition = {
  service,
  displayName: "Zhihu",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Secret",
      placeholder: "zhihu_access_secret",
      description:
        "Zhihu Open Platform Access Secret sent with the Authorization: Bearer header. View it in the Zhihu Open Platform profile page: https://developer.zhihu.com/profile.",
    },
  ],
  homepageUrl: "https://www.zhihu.com",
  actions: zhihuActions,
};
