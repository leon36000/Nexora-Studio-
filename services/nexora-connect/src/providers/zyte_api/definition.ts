import type { ProviderDefinition } from "../../core/types.ts";

import { zyteApiActions } from "./actions.ts";

const service = "zyte_api";

export const provider: ProviderDefinition = {
  service,
  displayName: "Zyte API",
  categories: ["Developer Tools", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "YOUR_ZYTE_API_KEY",
      description:
        "Zyte API key used as the Basic Auth username for the Zyte Extraction API. Create or copy it from the Zyte API access page: https://app.zyte.com/o/zyte-api/api-access",
    },
  ],
  homepageUrl: "https://www.zyte.com/zyte-api/",
  actions: zyteApiActions,
};
