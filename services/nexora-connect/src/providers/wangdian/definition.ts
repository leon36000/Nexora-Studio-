import type { ProviderDefinition } from "../../core/types.ts";

import { wangdianActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "wangdian",
  displayName: "Wangdian ERP",
  description: "Read shops, warehouses, goods, inventory, orders, stockouts, and refunds from Wangdian ERP.",
  categories: ["Productivity", "Data"],
  authTypes: ["custom_credential"],
  auth: [
    {
      type: "custom_credential",
      fields: [
        {
          key: "sid",
          label: "SID",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "Your Wangdian seller account",
          description:
            "The seller account assigned when purchasing Wangdian ERP. View it with your production application credentials or ask the ERP purchaser: https://open.wangdian.cn/open/guide?path=guide_jkgf",
        },
        {
          key: "appKey",
          label: "AppKey",
          inputType: "text",
          required: true,
          secret: false,
          placeholder: "Your Wangdian AppKey",
          description:
            "The production application AppKey created under Self-service Integration > Application Management in the Wangdian Open Platform: https://open.wangdian.cn/open/guide?path=guide_kfzn",
        },
        {
          key: "appSecret",
          label: "AppSecret",
          inputType: "password",
          required: true,
          secret: true,
          placeholder: "Your Wangdian AppSecret",
          description:
            "The production AppSecret paired with the AppKey in Wangdian Open Platform Application Management. It is used only to sign requests and is never sent to Wangdian: https://open.wangdian.cn/open/guide?path=guide_signsf",
        },
      ],
      testAction: {
        actionName: "list_warehouses",
        input: { pageNo: 0, pageSize: 1 },
      },
    },
  ],
  homepageUrl: "https://www.wangdian.cn",
  actions: wangdianActions,
};
