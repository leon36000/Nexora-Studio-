import type { ProviderDefinition } from "../../core/types.ts";

import { webinarjamActions } from "./actions.ts";

const service = "webinarjam";

export const provider: ProviderDefinition = {
  service,
  displayName: "WebinarJam",
  categories: ["Communication", "Marketing"],
  authTypes: ["api_key"],
  auth: [
    {
      type: "api_key",
      label: "API Key",
      placeholder: "WEBINARJAM_API_KEY",
      description:
        "WebinarJam API key sent as the api_key form field. Find or regenerate it from your WebinarJam API custom integration settings: https://support.webinarjam.com/support/solutions/articles/153000246357-regenerate-a-webinarjam-everwebinar-api-key",
      extraFields: [],
    },
  ],
  homepageUrl: "https://webinarjam.com",
  actions: webinarjamActions,
};
