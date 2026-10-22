import type { ProviderDefinition } from "../../core/types.ts";

import { spiderActions } from "./actions.ts";

const service = "spider";

export const provider: ProviderDefinition = {
  service,
  displayName: "Spider Cloud",
  categories: ["Data", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SPIDER_API_KEY",
      description:
        "Spider Cloud API key sent as a Bearer token. Create or manage keys at https://spider.cloud/api-keys.",
    },
  ],
  homepageUrl: "https://spider.cloud",
  actions: spiderActions,
};
