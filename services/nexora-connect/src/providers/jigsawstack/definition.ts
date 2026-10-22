import type { ProviderDefinition } from "../../core/types.ts";

import { jigsawstackActions } from "./actions.ts";

const service = "jigsawstack";

export const provider: ProviderDefinition = {
  service,
  displayName: "JigsawStack",
  categories: ["AI", "Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Secret API Key",
      placeholder: "JIGSAWSTACK_API_KEY",
      description:
        "JigsawStack secret API key sent in the x-api-key header. Create or manage keys from the Keys tab in the official dashboard: https://jigsawstack.com/dashboard.",
    },
  ],
  homepageUrl: "https://jigsawstack.com",
  actions: jigsawstackActions,
};
