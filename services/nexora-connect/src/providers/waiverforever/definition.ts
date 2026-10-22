import type { ProviderDefinition } from "../../core/types.ts";

import { waiverforeverActions } from "./actions.ts";

const service = "waiverforever";

export const provider: ProviderDefinition = {
  service,
  displayName: "WaiverForever",
  categories: ["Productivity"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "WAIVERFOREVER_API_KEY",
      description:
        "WaiverForever API key sent with the X-API-Key header. Generate it from Settings / Integration in your WaiverForever account: https://app.waiverforever.com/settings/integrations",
      extraFields: [],
    },
  ],
  homepageUrl: "https://www.waiverforever.com",
  actions: waiverforeverActions,
};
