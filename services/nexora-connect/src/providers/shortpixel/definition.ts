import type { ProviderDefinition } from "../../core/types.ts";

import { shortpixelActions } from "./actions.ts";

export const provider: ProviderDefinition = {
  service: "shortpixel",
  displayName: "ShortPixel",
  categories: ["Media", "Developer Tools"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "SHORTPIXEL_API_KEY",
      description:
        "ShortPixel API key used in documented query-string and path-based endpoints. You can find your API key in the ShortPixel dashboard or signup email: https://shortpixel.com/knowledge-base/article/can-i-use-shortpixel-on-a-different-site-and-how-do-i-get-more-credits/.",
    },
  ],
  homepageUrl: "https://shortpixel.com",
  actions: shortpixelActions,
};
