import type { ProviderDefinition } from "../../core/types.ts";

import { detrackActions } from "./actions.ts";

const service = "detrack";

export const provider: ProviderDefinition = {
  service,
  displayName: "Detrack",
  categories: ["Productivity", "Location"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "detrack_api_key",
      description:
        "Detrack API key sent with the X-API-KEY header. Generate or view it under Integrations > API Key: https://help.detrack.com/en/articles/6553302-how-to-generate-your-api-key.",
    },
  ],
  homepageUrl: "https://www.detrack.com",
  actions: detrackActions,
};
