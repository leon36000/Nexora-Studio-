import type { ProviderDefinition } from "../../core/types.ts";

import { tencentMapsActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "tencent_maps",
  displayName: "Tencent Maps",
  categories: ["Location"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "TENCENT_MAPS_API_KEY",
      description:
        "Tencent Maps API key sent as the key query parameter. Create or manage a key in the official console: https://lbs.qq.com/dev/console/key/manage.",
    },
  ],
  homepageUrl: "https://lbs.qq.com",
  actions: tencentMapsActions,
};
