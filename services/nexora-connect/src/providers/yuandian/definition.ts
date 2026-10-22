import type { ProviderDefinition } from "../../core/types.ts";

import { yuandianActions } from "./actions.ts";

const service = "yuandian";

export const provider: ProviderDefinition = {
  service,
  displayName: "Yuan Dian",
  categories: ["AI", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YUANDIAN_API_KEY",
      description:
        "Yuan Dian Open Platform API key sent with the X-API-Key header. Connection validation calls the low-cost enterprise search endpoint and consumes 1 Yuan Dian point.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://open.chineselaw.com",
  actions: yuandianActions,
};
