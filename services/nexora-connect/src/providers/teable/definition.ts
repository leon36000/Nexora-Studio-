import type { ProviderDefinition } from "../../core/types.ts";

import { teableActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "teable",
  displayName: "Teable",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "TEABLE_PERSONAL_ACCESS_TOKEN",
      description: "Create a personal access token at app.teable.cn/setting/personal-access-token and paste it here.",
    },
  ],
  homepageUrl: "https://teable.cn",
  actions: teableActions,
};
