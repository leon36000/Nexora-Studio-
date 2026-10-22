import type { ProviderDefinition } from "../../core/types.ts";

import { deepseekActions } from "./actions.ts";

const service = "deepseek";

export const provider: ProviderDefinition = {
  service,
  displayName: "DeepSeek",
  categories: ["AI"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "sk-...",
      description:
        "DeepSeek API key used for DeepSeek API requests. Create or manage keys at https://platform.deepseek.com/api_keys.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://platform.deepseek.com",
  actions: deepseekActions,
};
