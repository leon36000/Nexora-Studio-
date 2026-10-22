import type { ProviderDefinition } from "../../core/types.ts";

import { maintainxActions } from "./actions.ts";

const service = "maintainx";

export const provider: ProviderDefinition = {
  service,
  displayName: "MaintainX",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "MAINTAINX_API_KEY",
      description:
        "MaintainX REST API key sent with the Authorization: Bearer header. Generate a key in MaintainX under Settings > Integrations > API Keys: https://app.getmaintainx.com/settings/integrations/apiKeys.",
    },
  ],
  homepageUrl: "https://www.getmaintainx.com/",
  actions: maintainxActions,
};
