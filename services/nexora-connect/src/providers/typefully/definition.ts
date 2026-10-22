import type { ProviderDefinition } from "../../core/types.ts";

import { typefullyActions } from "./actions.ts";

const service = "typefully";

export const provider: ProviderDefinition = {
  service,
  displayName: "Typefully",
  categories: ["Social", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TYPEFULLY_API_KEY",
      description:
        "Typefully API key used with the Authorization Bearer header. Generate it from your Typefully settings: https://typefully.com/docs/api",
    },
  ],
  homepageUrl: "https://typefully.com",
  actions: typefullyActions,
};
