import type { ProviderDefinition } from "../../core/types.ts";

import { zixflowActions } from "./actions.ts";

const service = "zixflow";

export const provider: ProviderDefinition = {
  service,
  displayName: "Zixflow",
  categories: ["Marketing", "Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "ZIXFLOW_API_TOKEN",
      description:
        "Zixflow API token used with the Authorization Bearer header. Create it in Workspace Settings under Developer > API Keys: https://docs.zixflow.com/api-reference/introduction.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://zixflow.com",
  actions: zixflowActions,
};
