import type { ProviderDefinition } from "../../core/types.ts";

import { v2exActions } from "./actions.ts";

const service = "v2ex";

export const provider: ProviderDefinition = {
  service,
  displayName: "V2EX",
  categories: ["Social", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Personal Access Token",
      placeholder: "V2EX personal access token",
      description:
        "V2EX Personal Access Token used as a Bearer token for API 2.0 requests. Create or manage tokens from your V2EX token settings.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.v2ex.com",
  actions: v2exActions,
};
