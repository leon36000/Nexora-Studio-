import type { ProviderDefinition } from "../../core/types.ts";

import { safetycultureActions } from "./actions.ts";

const service = "safetyculture";

export const provider: ProviderDefinition = {
  service,
  displayName: "SafetyCulture",
  categories: ["Productivity", "Data"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Token",
      placeholder: "SAFETYCULTURE_API_TOKEN",
      description:
        "SafetyCulture API token sent as a Bearer token. Create or manage API tokens from the SafetyCulture web app.",
      extraFields: [],
    },
  ],
  homepageUrl: "https://safetyculture.com",
  actions: safetycultureActions,
};
