import type { ProviderDefinition } from "../../core/types.ts";

import { metaActions } from "./actions.ts";

const service = "meta";

export const provider: ProviderDefinition = {
  service,
  displayName: "Meta",
  categories: ["Marketing", "Social"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "Access Token",
      placeholder: "EAAG...",
      description:
        "Meta access token used with the Authorization: Bearer header. Create or view system user and app tokens in Meta Business Settings: https://business.facebook.com/latest/settings. The read-only Ads actions usually require permissions such as ads_read.",
    },
  ],
  homepageUrl: "https://business.meta.com/",
  actions: metaActions,
};
