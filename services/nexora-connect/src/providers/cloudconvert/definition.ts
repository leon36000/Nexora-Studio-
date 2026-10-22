import type { ProviderDefinition } from "../../core/types.ts";

import { cloudconvertActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "cloudconvert",
  displayName: "CloudConvert",
  categories: ["Productivity", "Design & Media"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "cloudconvert_api_key",
      description:
        "CloudConvert API key sent with the Authorization Bearer header. Create and manage it at https://cloudconvert.com/dashboard/api/v2/keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://cloudconvert.com",
  actions: cloudconvertActions,
};
